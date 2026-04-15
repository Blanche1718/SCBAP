import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import {
  getDapgLiberationConditionnelle,
  listDapgLiberationConditionnelles,
} from "../integrations/dapg/client";
import { mapDapgLiberationConditionnelleToDossierCreateInput } from "../integrations/dapg/dossier.mapper";

export async function syncDapgLiberationConditionnelle(dapgId: string | number) {
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

  if (!dossier.beneficiaire) {
    await prisma.beneficiaire.create({
      data: {
        dossierId: dossier.id,
        statut: "ACTIF",
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

async function syncPayload(payload: Awaited<ReturnType<typeof getDapgLiberationConditionnelle>>) {
  const dossierData = mapDapgLiberationConditionnelleToDossierCreateInput(payload);
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

  if (!dossier.beneficiaire) {
    await prisma.beneficiaire.create({
      data: {
        dossierId: dossier.id,
        statut: "ACTIF",
        qrCode: `BEN-${dossier.numeroDossier}-${randomUUID().slice(0, 8)}`,
      },
    });
  }

  return {
    created: !existing,
    dossier,
  };
}

export async function syncAllDapgLiberationConditionnelles() {
  const firstPage = await listDapgLiberationConditionnelles(1, 50);
  const pages = Math.max(firstPage.last_page, 1);
  let createdCount = 0;
  let updatedCount = 0;
  let totalSynced = 0;

  const pagePayloads = [firstPage, ...(await Promise.all(
    Array.from({ length: pages - 1 }, async (_, index) =>
      listDapgLiberationConditionnelles(index + 2, 50),
    ),
  ))];

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
