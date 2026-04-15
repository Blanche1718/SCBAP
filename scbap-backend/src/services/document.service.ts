import { randomUUID } from "node:crypto";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
  createObjectKey,
  MINIO_BUCKET,
  getObjectDownloadUrl,
  uploadObjectToMinio,
} from "../integrations/storage/minio";

type PrismaDocument = {
  id: string;
  beneficiaireId: string;
  dossierId: string;
  typeDocument: string;
  titre: string;
  description: string | null;
  source: string;
  statut: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  bucket: string;
  objectKey: string;
  externalUrl: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const documentDb = prisma as typeof prisma & {
  document: any;
};

type CreateDocumentInput = {
  typeDocument: string;
  titre: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  source?: string;
};

function mapDocument(document: PrismaDocument) {
  return {
    ...document,
    downloadUrl: `/documents/${document.id}/download`,
  };
}

async function getBeneficiaireOrThrow(beneficiaireId: string) {
  return prisma.beneficiaire.findUniqueOrThrow({
    where: { id: beneficiaireId },
    include: {
      dossier: true,
    },
  });
}

async function getDocumentForBeneficiaireOrThrow(beneficiaireId: string, documentId: string) {
  return documentDb.document.findFirstOrThrow({
    where: {
      id: documentId,
      beneficiaireId,
    },
  });
}

export async function listBeneficiaireDocuments(beneficiaireId: string) {
  await getBeneficiaireOrThrow(beneficiaireId);

  const documents = await documentDb.document.findMany({
    where: {
      beneficiaireId,
      statut: "UPLOADED",
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return documents.map(mapDocument);
}

export async function createBeneficiaireDocument(
  beneficiaireId: string,
  input: CreateDocumentInput,
) {
  const beneficiaire = await getBeneficiaireOrThrow(beneficiaireId);

  const titre = input.titre.trim();
  if (!titre) {
    throw new HttpError(400, "Le titre du document est requis");
  }

  const typeDocument = input.typeDocument.trim();
  if (!typeDocument) {
    throw new HttpError(400, "Le type du document est requis");
  }

  const documentId = randomUUID();
  const objectKey = createObjectKey(beneficiaireId, documentId, input.fileName);

  const document = await documentDb.document.create({
    data: {
      id: documentId,
      beneficiaireId,
      dossierId: beneficiaire.dossierId,
      typeDocument,
      titre,
      description: input.description?.trim() || null,
      source: input.source?.trim() || "MANUAL",
      statut: "PENDING_UPLOAD",
      fileName: input.fileName?.trim() || null,
      mimeType: input.mimeType?.trim() || null,
      sizeBytes: input.sizeBytes ?? null,
      bucket: MINIO_BUCKET,
      objectKey,
    },
  });

  return {
    document: mapDocument(document),
    uploadPath: `/beneficiaires/${beneficiaireId}/documents/${document.id}/file`,
  };
}

export async function uploadBeneficiaireDocumentFile(
  beneficiaireId: string,
  documentId: string,
  body: Buffer,
  mimeType?: string | null,
) {
  const document = await getDocumentForBeneficiaireOrThrow(beneficiaireId, documentId);

  if (!body || body.length === 0) {
    throw new HttpError(400, "Le fichier est vide");
  }

  await uploadObjectToMinio({
    objectKey: document.objectKey,
    body,
    contentType: mimeType || document.mimeType || "application/octet-stream",
  });

  const updated = await documentDb.document.update({
    where: { id: document.id },
    data: {
      statut: "UPLOADED",
      mimeType: mimeType || document.mimeType || "application/octet-stream",
      sizeBytes: body.length,
      uploadedAt: new Date(),
    },
  });

  return mapDocument(updated);
}

export async function getBeneficiaireDocumentDownloadUrl(documentId: string) {
  const document = await documentDb.document.findUniqueOrThrow({
    where: { id: documentId },
  });

  if (document.externalUrl) {
    return document.externalUrl;
  }

  return getObjectDownloadUrl(document.objectKey);
}
