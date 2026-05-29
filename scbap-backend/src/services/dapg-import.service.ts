import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import {
  getDapgLiberationConditionnelle,
  listDapgLiberationConditionnelles,
} from "../integrations/dapg/client";
import { mapDapgLiberationConditionnelleToDossierCreateInput } from "../integrations/dapg/dossier.mapper";
import type { DapgLiberationConditionnelle } from "../integrations/dapg/types";
import {
  notifyNewBeneficiaireCreated,
  syncSpecificObligationsForBeneficiaire,
} from "./beneficiaire.service";
import {
  normalizeSpecificObligationsPayload,
  syncDapgSpecificObligationReferences,
} from "./obligation-specifique-reference.service";
import { normalizeJuridictionCode } from "../utils/juridiction";

async function syncDapgReferencesBestEffort() {
  try {
    await syncDapgSpecificObligationReferences();
  } catch (error) {
    console.warn(
      "Synchronisation du referentiel DAPG des obligations ignoree; les obligations embarquees seront utilisees.",
      error,
    );
  }
}

async function ensureDapgJuridiction(payload: DapgLiberationConditionnelle) {
  const juridictionName = typeof payload.juridiction?.name === "string"
    ? payload.juridiction.name.trim()
    : "";
  const juridictionCode = normalizeJuridictionCode(
    payload.juridiction?.code ?? (juridictionName || payload.juridiction?.id),
  );

  if (!juridictionCode) {
    return;
  }

  await prisma.juridiction.upsert({
    where: { id: juridictionCode },
    create: {
      id: juridictionCode,
      nom: juridictionName || juridictionCode,
    },
    update: juridictionName
      ? {
          nom: juridictionName,
        }
      : {},
  });
}

async function ensureBeneficiaireForDossier(dossier: {
  id: string;
  numeroDossier: string;
  nom?: string | null;
  prenom?: string | null;
  createdAt?: Date | null;
  beneficiaire: { id: string } | null;
}) {
  if (!dossier.beneficiaire) {
    const beneficiaire = await prisma.beneficiaire.create({
      data: {
        dossierId: dossier.id,
        profilStatut: "A_CONFIGURER",
        statut: "A_CONFIGURER",
        profilConfirme: false,
        qrCode: `BEN-${dossier.numeroDossier}-${randomUUID().slice(0, 8)}`,
      },
    });

    await notifyNewBeneficiaireCreated({
      beneficiaireId: beneficiaire.id,
      dossier,
      source: "DAPG",
    });
  }

  return prisma.dossier.findUniqueOrThrow({
    where: { id: dossier.id },
    include: {
      beneficiaire: true,
    },
  });
}

async function syncDossierSpecificObligations(
  dossier: Awaited<ReturnType<typeof ensureBeneficiaireForDossier>>,
  payload: DapgLiberationConditionnelle,
) {
  if (!dossier.beneficiaire || !Array.isArray(payload.obligations_specifiques)) {
    return;
  }

  await syncSpecificObligationsForBeneficiaire(
    dossier.beneficiaire.id,
    normalizeSpecificObligationsPayload(payload.obligations_specifiques),
    undefined,
    { allowConfirmed: true },
  );
}

export async function syncDapgLiberationConditionnelle(dapgId: string | number) {
  await syncDapgReferencesBestEffort();

  const payload = await getDapgLiberationConditionnelle(dapgId);
  await ensureDapgJuridiction(payload);

  const dossierData = mapDapgLiberationConditionnelleToDossierCreateInput(payload);

  const dossier = await prisma.dossier.upsert({
    where: {
      numeroDossier: dossierData.numeroDossier,
    },
    create: dossierData,
    update: {
      ...dossierData,
      othersData: dossierData.othersData,
    },
    include: {
      beneficiaire: true,
    },
  });

  const dossierWithBeneficiaire = await ensureBeneficiaireForDossier(dossier);
  await syncDossierSpecificObligations(dossierWithBeneficiaire, payload);

  return prisma.dossier.findUniqueOrThrow({
    where: { id: dossier.id },
    include: {
      beneficiaire: {
        include: {
          obligations: {
            include: {
              categorie: true,
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });
}

async function syncPayload(payload: Awaited<ReturnType<typeof getDapgLiberationConditionnelle>>) {
  const detailedPayload = payload.id
    ? await getDapgLiberationConditionnelle(payload.id).catch(() => payload)
    : payload;
  await ensureDapgJuridiction(detailedPayload);
  const dossierData = mapDapgLiberationConditionnelleToDossierCreateInput(detailedPayload);
  const existing = await prisma.dossier.findUnique({
    where: { numeroDossier: dossierData.numeroDossier },
    select: { id: true },
  });

  const dossier = await prisma.dossier.upsert({
    where: {
      numeroDossier: dossierData.numeroDossier,
    },
    create: dossierData,
    update: {
      ...dossierData,
      othersData: dossierData.othersData,
    },
    include: {
      beneficiaire: true,
    },
  });

  const dossierWithBeneficiaire = await ensureBeneficiaireForDossier(dossier);
  await syncDossierSpecificObligations(dossierWithBeneficiaire, detailedPayload);

  return {
    created: !existing,
    dossier: dossierWithBeneficiaire,
  };
}

export async function syncAllDapgLiberationConditionnelles() {
  await syncDapgReferencesBestEffort();

  const firstPage = await listDapgLiberationConditionnelles(1, 50);
  const pages = Math.max(firstPage.last_page, 1);
  let createdCount = 0;
  let updatedCount = 0;
  let totalSynced = 0;

  const pagePayloads = [firstPage];

  for (let pageNumber = 2; pageNumber <= pages; pageNumber += 1) {
    pagePayloads.push(await listDapgLiberationConditionnelles(pageNumber, 50));
  }

  for (const page of pagePayloads) {
    for (const payload of page.data) {
      const result = await syncPayload(payload);
      totalSynced += 1;
      if (result.created) {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }
    }
  }

  return {
    totalSynced,
    createdCount,
    updatedCount,
    lastPage: pages,
  };
}
