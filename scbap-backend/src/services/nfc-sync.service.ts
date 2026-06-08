import prisma from "../prisma";
import { listNfcDetenus, type NfcDetenuPayload } from "../integrations/nfc/client";

type SyncIssue = {
  numeroMandat?: string;
  nfc?: string;
  message: string;
};

type SyncResult = {
  fetched: number;
  recordsWithNfc: number;
  matched: number;
  updated: number;
  unchanged: number;
  conflicts: number;
  missingInScbap: number;
  issues: SyncIssue[];
  mandatsTrouvesEnBase?: string[];
  mandatsExternesNonTrouvés?: Array<{ numeroMandat: string; nfc: string }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function getNestedNfc(record: Record<string, unknown>) {
  return (
    asText(asRecord(record.detenu)?.nfc) ||
    asText(record.nfc) ||
    asText(asRecord(record.detenu)?.badgeNfc)
  );
}

function extractMandatNfcPairs(payload: NfcDetenuPayload[]) {
  const nfcByMandat = new Map<string, string>();
  let recordsWithNfc = 0;

  for (const item of payload) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }

    const topLevelNfc = getNestedNfc(record);
    const dossiersJudiciaires = Array.isArray(record.dossiersJudiciaires)
      ? record.dossiersJudiciaires
      : [];

    for (const dossierItem of dossiersJudiciaires) {
      const dossier = asRecord(dossierItem);
      if (!dossier) {
        continue;
      }

      const numeroMandat = asText(dossier.numeroMandat);
      const nfc = normalizeKey(getNestedNfc(dossier) || topLevelNfc);

      if (!numeroMandat || !nfc) {
        continue;
      }

      recordsWithNfc += 1;
      nfcByMandat.set(normalizeKey(numeroMandat), nfc);
    }
  }

  return {
    nfcByMandat,
    recordsWithNfc,
  };
}

export async function syncBeneficiaireNfcBadges() {
  const payload = await listNfcDetenus();
  const { nfcByMandat, recordsWithNfc } = extractMandatNfcPairs(payload);
  const issues: SyncIssue[] = [];

  if (nfcByMandat.size === 0) {
    return {
      fetched: payload.length,
      recordsWithNfc,
      matched: 0,
      updated: 0,
      unchanged: 0,
      conflicts: 0,
      missingInScbap: 0,
      issues: [
        {
          message: "Aucun NFC trouvé dans le payload externe. Vérifiez que les données contiennent dossiersJudiciaires[].detenu.nfc.",
        },
      ],
    };
  }

  const beneficiaires = await prisma.beneficiaire.findMany({
    where: {
      dossier: {
        is: {
          numeroMandatDepot: {
            in: Array.from(nfcByMandat.keys()),
            mode: "insensitive",
          },
          deletedAt: null,
        },
      },
    },
    include: {
      dossier: true,
    },
  });

  const matchedMandats = new Set<string>();
  const existingWithNfc = await prisma.beneficiaire.findMany({
    where: {
      badgeNfc: {
        in: Array.from(new Set(nfcByMandat.values())),
      },
    },
    select: {
      id: true,
      badgeNfc: true,
      dossier: {
        select: {
          numeroMandatDepot: true,
        },
      },
    },
  });
  const nfcOwnerByNfc = new Map(
    existingWithNfc
      .filter((item) => item.badgeNfc)
      .map((item) => [normalizeKey(item.badgeNfc as string), item]),
  );

  let updated = 0;
  let unchanged = 0;
  let conflicts = 0;
  const updatedMandats = new Set<string>();
  const unchangedMandats = new Set<string>();
  const conflictMandats = new Set<string>();

  for (const beneficiaire of beneficiaires) {
    const mandatKey = normalizeKey(beneficiaire.dossier.numeroMandatDepot);
    const nfc = nfcByMandat.get(mandatKey);
    if (!nfc) {
      continue;
    }

    matchedMandats.add(mandatKey);

    if (normalizeKey(beneficiaire.badgeNfc ?? "") === nfc) {
      unchanged += 1;
      unchangedMandats.add(mandatKey);
      continue;
    }

    const currentOwner = nfcOwnerByNfc.get(nfc);
    if (currentOwner && currentOwner.id !== beneficiaire.id) {
      conflicts += 1;
      conflictMandats.add(mandatKey);
      issues.push({
        numeroMandat: beneficiaire.dossier.numeroMandatDepot,
        nfc,
        message: `NFC déjà associé au mandat ${currentOwner.dossier?.numeroMandatDepot ?? "inconnu"}`,
      });
      continue;
    }

    await prisma.beneficiaire.update({
      where: { id: beneficiaire.id },
      data: {
        badgeNfc: nfc,
        badgeNfcAssocieLe: new Date(),
      },
    });

    nfcOwnerByNfc.set(nfc, {
      id: beneficiaire.id,
      badgeNfc: nfc,
      dossier: {
        numeroMandatDepot: beneficiaire.dossier.numeroMandatDepot,
      },
    });
    updated += 1;
    updatedMandats.add(mandatKey);
  }

  const missingInScbap = Array.from(nfcByMandat.keys()).filter(
    (mandat) => !matchedMandats.has(mandat),
  );

  // Persist a record for each external mandat so admins can review history.
  // If the same mandat already exists, update the existing record instead of creating a duplicate.
  const beneficiaireByMandat = new Map(
    beneficiaires.map((b) => [normalizeKey(b.dossier.numeroMandatDepot), b]),
  );

  const existingRecords = await prisma.nfcSyncRecord.findMany({
    where: {
      numeroMandat: {
        in: Array.from(nfcByMandat.keys()),
        mode: "insensitive",
      },
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  const existingRecordByMandat = new Map<string, typeof existingRecords[number]>();
  const duplicateRecordIds: string[] = [];

  for (const record of existingRecords) {
    const key = normalizeKey(record.numeroMandat);
    if (!existingRecordByMandat.has(key)) {
      existingRecordByMandat.set(key, record);
    } else {
      duplicateRecordIds.push(record.id);
    }
  }

  if (duplicateRecordIds.length > 0) {
    await prisma.nfcSyncRecord.deleteMany({
      where: {
        id: {
          in: duplicateRecordIds,
        },
      },
    });
  }

  for (const mandatKey of Array.from(nfcByMandat.keys())) {
    const nfc = nfcByMandat.get(mandatKey) || "";
    let status = "missing";
    let beneficiaireId: string | null = null;
    let beneficiaireNom: string | null = null;
    let beneficiairePrenom: string | null = null;

    if (matchedMandats.has(mandatKey)) {
      if (conflictMandats.has(mandatKey)) {
        status = "conflict";
      } else if (updatedMandats.has(mandatKey)) {
        status = "updated";
      } else if (unchangedMandats.has(mandatKey)) {
        status = "unchanged";
      } else {
        status = "matched";
      }

      const b = beneficiaireByMandat.get(mandatKey);
      if (b) {
        beneficiaireId = b.id;
        beneficiaireNom = b.dossier?.nom ?? null;
        beneficiairePrenom = b.dossier?.prenom ?? null;
      }
    }

    const payload = {
      numeroMandat: mandatKey,
      nfc,
      status,
      beneficiaireId: beneficiaireId ?? undefined,
      beneficiaireNom: beneficiaireNom ?? undefined,
      beneficiairePrenom: beneficiairePrenom ?? undefined,
    };

    try {
      const existingRecord = existingRecordByMandat.get(mandatKey);
      if (existingRecord) {
        await prisma.nfcSyncRecord.update({
          where: { id: existingRecord.id },
          data: payload,
        });
      } else {
        await prisma.nfcSyncRecord.create({
          data: payload,
        });
      }
    } catch (err) {
      // ignore persistence errors but log minimally
      // console.warn("Failed to persist nfc sync record", { mandatKey, err });
    }
  }

  // Ajouter les détails des mandats manquants
  if (missingInScbap.length > 0) {
    const detailedMissing = missingInScbap.slice(0, 5).map((mandat) => ({
      numeroMandat: mandat,
      nfc: nfcByMandat.get(mandat),
      message: `Aucun bénéficiaire trouvé avec ce numéro de mandat en base. Vérifiez que le détenu est créé et que le dossier.numeroMandatDepot correspond.`,
    }));
    issues.push(...detailedMissing);
  }

  return {
    fetched: payload.length,
    recordsWithNfc,
    matched: matchedMandats.size,
    updated,
    unchanged,
    conflicts,
    missingInScbap: missingInScbap.length,
    issues: issues.slice(0, 10),
    mandatsTrouvesEnBase: Array.from(matchedMandats).slice(0, 10),
    mandatsExternesNonTrouvés: missingInScbap
      .slice(0, 10)
      .map((mandat) => ({
        numeroMandat: mandat,
        nfc: nfcByMandat.get(mandat) || "",
      })),
  };
}

