import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import { HttpError } from "../errorHandler";
import { PortalAuthenticatedSession } from "../auth/portal-auth.types";
import { CreatePortalEvaluationInput } from "../schemas/portail.schema";
import {
  APP_TIME_ZONE,
  buildDateInAppTimeZone,
  getTimeZoneDateParts,
} from "../utils/timezone";
import {
  MINIO_BUCKET,
  createObjectKey,
  deleteObjectFromMinio,
  getObjectDownloadUrl,
  uploadObjectToMinio,
} from "../integrations/storage/minio";
import { createNotification } from "./notification.service";

type PortalEvaluationDocumentInput = {
  typeDocument: string;
  titre: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type EvaluationOccurrenceRecord = {
  id: string;
  dateSuivi: Date;
  present: boolean;
};

type EvaluationDocumentRecord = {
  id: string;
  typeDocument: string;
  titre: string;
  description: string | null;
  fileName: string | null;
  mimeType: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
};

type EvaluationRecord = {
  id: string;
  affectationId: string;
  serviceId: string;
  beneficiaireId: string;
  obligationId: string | null;
  periodeMois: Date;
  frequenceSuivi: string;
  dateConstat: Date;
  present: boolean;
  conformite: string;
  observations: string | null;
  commentaire: string | null;
  createdAt: Date;
  updatedAt: Date;
  service: {
    id: string;
    nom: string;
    type: string;
    email: string;
  };
  affectation: {
    id: string;
    typeSuivi: string;
    libelleSuivi: string;
    codeSuivi: string;
  };
  obligation: {
    id: string;
    type: string | null;
    description: string | null;
    frequence: string | null;
    lieu: string | null;
    categorie: {
      id: string;
      nom: string;
    } | null;
  } | null;
  occurrences?: EvaluationOccurrenceRecord[];
  documents?: EvaluationDocumentRecord[];
};

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string, label: string) {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!year || !month || !day) {
    throw new HttpError(400, `La date ${label} est invalide`);
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function normalizePeriodeMois(value?: string) {
  if (value) {
    const date = parseDateOnly(value, "de periode");
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  }

  const parts = getTimeZoneDateParts(new Date(), APP_TIME_ZONE);
  return buildDateInAppTimeZone({
    year: parts.year,
    month: parts.month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

function getPeriodMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ensureDateInPeriod(date: Date, periodeMois: Date, label: string) {
  if (getPeriodMonthKey(date) !== getPeriodMonthKey(periodeMois)) {
    throw new HttpError(
      400,
      `La date ${label} doit appartenir au mois de la periode evaluée.`,
    );
  }
}

function getDailyDatesForPeriod(periodeMois: Date) {
  const year = periodeMois.getUTCFullYear();
  const month = periodeMois.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dates: Date[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    dates.push(new Date(Date.UTC(year, month, day, 0, 0, 0)));
  }

  return dates;
}

function mapEvaluationDocument(document: EvaluationDocumentRecord, evaluationId: string) {
  return {
    id: document.id,
    typeDocument: document.typeDocument,
    titre: document.titre,
    description: document.description,
    fileName: document.fileName,
    mimeType: document.mimeType,
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    downloadUrl: `/documents/${document.id}/download`,
    portalDownloadUrl: `/portail/evaluations/${evaluationId}/documents/${document.id}/download`,
  };
}

function mapEvaluation(record: EvaluationRecord) {
  return {
    id: record.id,
    affectationId: record.affectationId,
    serviceId: record.serviceId,
    beneficiaireId: record.beneficiaireId,
    obligationId: record.obligationId,
    periodeMois: formatDateOnly(record.periodeMois),
    frequenceSuivi: record.frequenceSuivi,
    dateConstat: formatDateOnly(record.dateConstat),
    present: record.present,
    conformite: record.conformite,
    observations: record.observations,
    commentaire: record.commentaire,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    service: {
      id: record.service.id,
      nom: record.service.nom,
      type: record.service.type,
      email: record.service.email,
    },
    affectation: {
      id: record.affectation.id,
      typeSuivi: record.affectation.typeSuivi,
      libelleSuivi: record.affectation.libelleSuivi,
      codeSuivi: record.affectation.codeSuivi,
    },
    obligation: record.obligation
      ? {
          id: record.obligation.id,
          type: record.obligation.type,
          description: record.obligation.description,
          frequence: record.obligation.frequence,
          lieu: record.obligation.lieu,
          categorie: record.obligation.categorie
            ? {
                id: record.obligation.categorie.id,
                nom: record.obligation.categorie.nom,
              }
            : null,
        }
      : null,
    occurrences: (record.occurrences ?? []).map((occurrence) => ({
      id: occurrence.id,
      dateSuivi: formatDateOnly(occurrence.dateSuivi),
      present: occurrence.present,
    })),
    documents: (record.documents ?? []).map((document) =>
      mapEvaluationDocument(document, record.id),
    ),
  };
}

async function getEvaluationForPortalSessionOrThrow(
  session: PortalAuthenticatedSession,
  evaluationId: string,
) {
  const evaluation = await prisma.evaluationServiceExterne.findFirst({
    where: {
      id: evaluationId,
      affectationId: session.affectationId,
      serviceId: session.serviceId,
      beneficiaireId: session.beneficiaireId,
    },
    include: {
      beneficiaire: {
        select: {
          dossierId: true,
        },
      },
    },
  });

  if (!evaluation) {
    throw new HttpError(404, "Evaluation introuvable");
  }

  return evaluation;
}

export async function createPortalEvaluation(
  session: PortalAuthenticatedSession,
  input: CreatePortalEvaluationInput,
) {
  const periodeMois = normalizePeriodeMois(input.periodeMois);

  const existing = await prisma.evaluationServiceExterne.findUnique({
    where: {
      affectationId_periodeMois: {
        affectationId: session.affectationId,
        periodeMois,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new HttpError(409, "Vous avez deja soumis une evaluation pour ce mois.");
  }
  
  // Dériver dateConstat et present à partir du tableau d'occurrences
  if (!input.occurrences || input.occurrences.length === 0) {
    throw new HttpError(400, "Au moins une occurrence de suivi est requise.");
  }

  // Trier les occurrences par date pour obtenir la dernière pour dateConstat
  const sortedOccurrences = [...input.occurrences].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const lastOccurrenceDate = parseDateOnly(sortedOccurrences[sortedOccurrences.length - 1].date, "du constat");
  const allPresent = input.occurrences.every(occ => occ.present);

  const evaluation = await prisma.evaluationServiceExterne.create({
    data: {
      affectationId: session.affectationId,
      serviceId: session.serviceId,
      beneficiaireId: session.beneficiaireId,
      obligationId: session.obligationId || null,
      periodeMois,
      frequenceSuivi: input.frequenceSuivi ?? session.frequenceAttendue ?? "MENSUEL",
      dateConstat: lastOccurrenceDate, // Dérivé
      present: allPresent, // Dérivé
      conformite: input.conformite,
      observations: input.observations?.trim() || null,
      commentaire: input.commentaire?.trim() || null,
      occurrences: {
        create: input.occurrences.map(occ => ({
          dateSuivi: parseDateOnly(occ.date, "de suivi"),
          present: occ.present,
        })),
      },
    },
    include: {
      beneficiaire: {
        select: {
          id: true,
          statut: true,
          dossier: {
            select: {
              id: true,
              numeroDossier: true,
              numeroMandatDepot: true,
              nom: true,
              prenom: true,
              juridictionId: true,
            },
          },
        },
      },
      service: true,
      affectation: true,
      obligation: {
        include: {
          categorie: true,
        },
      },
      occurrences: {
        orderBy: {
          dateSuivi: "asc",
        },
      },
      documents: {
        where: {
          statut: "UPLOADED",
        },
        orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  const dossier = session.beneficiaire.dossier;

  // Notification unique visible par tous les comptes de la juridiction dans la plateforme.
  // On évite ainsi de dépendre d'une liste d'agents potentiellement incomplète.
  if (dossier?.juridictionId) {
    await createNotification({
      beneficiaireId: session.beneficiaireId,
      type: "EVALUATION_SERVICE_EXTERNE_RECUE",
      priorite: "INFO",
      targetType: "BENEFICIAIRE",
      targetId: session.beneficiaireId,
      message: `Nouvelle évaluation reçue (${session.service.nom}) pour ${dossier.prenom} ${dossier.nom}`,
      metadata: {
        evaluationId: evaluation.id,
        serviceNom: session.service.nom,
        periodeMois: formatDateOnly(periodeMois),
        juridictionId: dossier.juridictionId,
      },
    });
  }

  return mapEvaluation(evaluation);
}

export async function listBeneficiaireEvaluations(beneficiaireId: string) {
  const evaluations = await prisma.evaluationServiceExterne.findMany({
    where: {
      beneficiaireId,
    },
    orderBy: [{ periodeMois: "desc" }, { createdAt: "desc" }],
    include: {
      service: true,
      affectation: true,
      obligation: {
        include: {
          categorie: true,
        },
      },
      occurrences: {
        orderBy: {
          dateSuivi: "asc",
        },
      },
      documents: {
        where: {
          statut: "UPLOADED",
        },
        orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  return evaluations.map((evaluation) => mapEvaluation(evaluation));
}

export async function listPortalEvaluations(session: PortalAuthenticatedSession) {
  const evaluations = await prisma.evaluationServiceExterne.findMany({
    where: {
      affectationId: session.affectationId,
      serviceId: session.serviceId,
      beneficiaireId: session.beneficiaireId,
    },
    orderBy: [{ periodeMois: "desc" }, { createdAt: "desc" }],
    include: {
      service: true,
      affectation: true,
      obligation: {
        include: {
          categorie: true,
        },
      },
      occurrences: {
        orderBy: {
          dateSuivi: "asc",
        },
      },
      documents: {
        where: {
          statut: "UPLOADED",
        },
        orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  return evaluations.map((evaluation) => mapEvaluation(evaluation));
}

export async function createPortalEvaluationDocument(
  session: PortalAuthenticatedSession,
  evaluationId: string,
  input: PortalEvaluationDocumentInput,
) {
  const evaluation = await getEvaluationForPortalSessionOrThrow(session, evaluationId);
  const titre = input.titre.trim();
  const typeDocument = input.typeDocument.trim();

  if (!titre) {
    throw new HttpError(400, "Le titre du document est requis");
  }

  if (!typeDocument) {
    throw new HttpError(400, "Le type du document est requis");
  }

  const documentId = randomUUID();
  const objectKey = createObjectKey(
    session.beneficiaireId,
    documentId,
    input.fileName,
  );

  const document = await prisma.document.create({
    data: {
      id: documentId,
      beneficiaireId: session.beneficiaireId,
      dossierId: evaluation.beneficiaire.dossierId,
      evaluationServiceExterneId: evaluation.id,
      typeDocument,
      titre,
      description: input.description?.trim() || null,
      source: "PORTAIL_EVALUATION",
      statut: "PENDING_UPLOAD",
      fileName: input.fileName?.trim() || null,
      mimeType: input.mimeType?.trim() || null,
      sizeBytes: input.sizeBytes ?? null,
      bucket: MINIO_BUCKET,
      objectKey,
    },
  });

  return {
    document: mapEvaluationDocument(document, evaluation.id),
    uploadPath: `/portail/evaluations/${evaluation.id}/documents/${document.id}/file`,
  };
}

export async function uploadPortalEvaluationDocumentFile(
  session: PortalAuthenticatedSession,
  evaluationId: string,
  documentId: string,
  body: Buffer,
  mimeType?: string | null,
) {
  if (!body || body.length === 0) {
    throw new HttpError(400, "Le fichier est vide");
  }

  await getEvaluationForPortalSessionOrThrow(session, evaluationId);

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      beneficiaireId: session.beneficiaireId,
      evaluationServiceExterneId: evaluationId,
    },
  });

  if (!document) {
    throw new HttpError(404, "Document introuvable");
  }

  await uploadObjectToMinio({
    objectKey: document.objectKey,
    body,
    contentType: mimeType || document.mimeType || "application/octet-stream",
  });

  const updated = await prisma.document.update({
    where: {
      id: document.id,
    },
    data: {
      statut: "UPLOADED",
      mimeType: mimeType || document.mimeType || "application/octet-stream",
      sizeBytes: body.length,
      uploadedAt: new Date(),
    },
  });

  return mapEvaluationDocument(updated, evaluationId);
}

export async function getPortalEvaluationDocumentDownloadUrl(
  session: PortalAuthenticatedSession,
  evaluationId: string,
  documentId: string,
) {
  await getEvaluationForPortalSessionOrThrow(session, evaluationId);

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      beneficiaireId: session.beneficiaireId,
      evaluationServiceExterneId: evaluationId,
      statut: "UPLOADED",
    },
  });

  if (!document) {
    throw new HttpError(404, "Document introuvable");
  }

  if (document.externalUrl) {
    return document.externalUrl;
  }

  return getObjectDownloadUrl(document.objectKey);
}

export async function deletePortalEvaluation(
  session: PortalAuthenticatedSession,
  evaluationId: string,
) {
  const evaluation = await prisma.evaluationServiceExterne.findFirst({
    where: {
      id: evaluationId,
      affectationId: session.affectationId,
      serviceId: session.serviceId,
      beneficiaireId: session.beneficiaireId,
    },
    include: {
      documents: true,
    },
  });

  if (!evaluation) {
    throw new HttpError(404, "Evaluation introuvable");
  }

  for (const document of evaluation.documents) {
    await deleteObjectFromMinio(document.objectKey).catch(() => undefined);
  }

  await prisma.$transaction([
    prisma.notification.deleteMany({
      where: {
        type: "EVALUATION_SERVICE_EXTERNE_RECUE",
        metadata: {
          path: ["evaluationId"],
          equals: evaluation.id,
        },
      },
    }),
    prisma.document.deleteMany({
      where: {
        evaluationServiceExterneId: evaluation.id,
      },
    }),
    prisma.evaluationServiceExterneOccurrence.deleteMany({
      where: {
        evaluationId: evaluation.id,
      },
    }),
    prisma.evaluationServiceExterne.delete({
      where: {
        id: evaluation.id,
      },
    }),
  ]);

  return { deleted: true };
}
