import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import {
  getDapgLiberationConditionnelle,
  listDapgLiberationConditionnelles,
} from "../integrations/dapg/client";
import { mapDapgLiberationConditionnelleToDossierCreateInput } from "../integrations/dapg/dossier.mapper";
import type { DapgLiberationConditionnelle } from "../integrations/dapg/types";
import { syncSpecificObligationsForBeneficiaire } from "./beneficiaire.service";
import {
  normalizeSpecificObligationsPayload,
  syncDapgSpecificObligationReferences,
} from "./obligation-specifique-reference.service";

async function ensureBeneficiaireForDossier(dossier: {
  id: string;
  numeroDossier: string;
  beneficiaire: { id: string } | null;
}) {
  if (!dossier.beneficiaire) {
    await prisma.beneficiaire.create({
      data: {
        dossierId: dossier.id,
        profilStatut: "A_CONFIGURER",
        statut: "A_CONFIGURER",
        profilConfirme: false,
        qrCode: `BEN-${dossier.numeroDossier}-${randomUUID().slice(0, 8)}`,
      },
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

  const profilStatut = dossier.beneficiaire.profilStatut ?? (
    dossier.beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER"
  );

  if (profilStatut !== "A_CONFIGURER") {
    return;
  }

  await syncSpecificObligationsForBeneficiaire(
    dossier.beneficiaire.id,
    normalizeSpecificObligationsPayload(payload.obligations_specifiques),
  );
}

export async function syncDapgLiberationConditionnelle(dapgId: string | number) {
  await syncDapgSpecificObligationReferences();

  const payload = await getDapgLiberationConditionnelle(dapgId);

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
  await syncDapgSpecificObligationReferences();

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
