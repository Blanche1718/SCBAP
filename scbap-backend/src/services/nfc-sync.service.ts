import prisma from "../prisma";
import { listNfcDetenus, type NfcDetenuPayload } from "../integrations/nfc/client";

type SyncIssue = {
  numeroMandat?: string;
  nfc?: string;
  message: string;
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
      issues,
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

  for (const beneficiaire of beneficiaires) {
    const mandatKey = normalizeKey(beneficiaire.dossier.numeroMandatDepot);
    const nfc = nfcByMandat.get(mandatKey);
    if (!nfc) {
      continue;
    }

    matchedMandats.add(mandatKey);

    if (normalizeKey(beneficiaire.badgeNfc ?? "") === nfc) {
      unchanged += 1;
      continue;
    }

    const currentOwner = nfcOwnerByNfc.get(nfc);
    if (currentOwner && currentOwner.id !== beneficiaire.id) {
      conflicts += 1;
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
  }

  const missingInScbap = Array.from(nfcByMandat.keys()).filter(
    (mandat) => !matchedMandats.has(mandat),
  ).length;

  return {
    fetched: payload.length,
    recordsWithNfc,
    matched: matchedMandats.size,
    updated,
    unchanged,
    conflicts,
    missingInScbap,
    issues: issues.slice(0, 10),
  };
}
