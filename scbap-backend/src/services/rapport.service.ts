import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import type { AuthenticatedUser } from "../auth/auth.types";
import { getUserJuridictionCode } from "../utils/juridiction";
import { HttpError } from "../errorHandler";
import { CreatePrefilledRapportSchema, UpdateDraftRapportSchema } from "../schemas/rapport.schema";
import type { z } from "zod";

type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

type Scope = {
  jurisdictionId?: string;
};

type CreatePrefilledRapportInput = z.infer<typeof CreatePrefilledRapportSchema>;
type UpdateDraftRapportInput = z.infer<typeof UpdateDraftRapportSchema>;

function isAdminAccess(user?: AccessContext) {
  return user?.role?.nom === "ADMIN";
}

function resolveScope(user?: AccessContext): Scope {
  if (isAdminAccess(user)) {
    return {};
  }

  return {
    jurisdictionId: getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__",
  };
}

function buildDossierScopeWhere(scope: Scope): Prisma.DossierWhereInput {
  return {
    deletedAt: null,
    ...(scope.jurisdictionId ? { juridictionId: scope.jurisdictionId } : {}),
  };
}

function buildBeneficiaireScopeWhere(scope: Scope): Prisma.BeneficiaireWhereInput {
  return {
    dossier: {
      is: buildDossierScopeWhere(scope),
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function getDocumentTitle(item: Record<string, unknown>, fallback: string) {
  return (
    asText(item.titre) ??
    asText(item.nom) ??
    asText(item.libelle) ??
    asText(item.type_document) ??
    asText(item.type) ??
    fallback
  );
}

function looksLikeDocumentLink(value: string) {
  return (
    /^(https?:)?\/\//i.test(value) ||
    /\.(pdf|doc|docx|png|jpe?g)(\?|#|$)/i.test(value) ||
    /^\/.*(document|download|fichier|file|media|storage|uploads|arrete|arr[êe]te)/i.test(value)
  );
}

function findDocumentLink(value: unknown): string | undefined {
  const text = asText(value);
  if (text && looksLikeDocumentLink(text)) {
    return text;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return Object.values(record)
    .map((item) => findDocumentLink(item))
    .find(Boolean);
}

function getDocumentLink(record: Record<string, unknown>): string | undefined {
  const directLink =
    asText(record.url) ??
    asText(record.url_arrete) ??
    asText(record.arrete_url) ??
    asText(record.document_url) ??
    asText(record.download_url) ??
    asText(record.telechargement_url) ??
    asText(record.pdf_url) ??
    asText(record.lien) ??
    asText(record.lien_document) ??
    asText(record.file_url) ??
    asText(record.fichier_url) ??
    asText(record.fichier) ??
    asText(record.path) ??
    asText(record.chemin);

  if (directLink) {
    return directLink;
  }

  const nestedLink: string | undefined = [
    asRecord(record.document),
    asRecord(record.file),
    asRecord(record.fichier),
    asRecord(record.piece_jointe),
    asRecord(record.pieceJointe),
  ]
    .map((item) => (item ? getDocumentLink(item) : undefined))
    .find(Boolean);

  return nestedLink ?? findDocumentLink(record);
}

function normalizeDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Date de rapport invalide");
  }

  return parsed;
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function valueOrNeant(value?: string | number | null) {
  if (value === undefined || value === null) {
    return "Néant";
  }

  const text = String(value).trim();
  return text || "Néant";
}

function formatPersonName(dossier?: { nom: string; prenom: string } | null) {
  return valueOrNeant(dossier ? `${dossier.nom} ${dossier.prenom}`.trim() : null);
}

function toSection(titre: string, lignes: string[], tone = "NEUTRE") {
  return {
    titre,
    tone,
    lignes: lignes.length > 0 ? lignes : ["Aucune donnee disponible pour cette rubrique."],
  };
}

function toTableSection(
  titre: string,
  colonnes: string[],
  lignes: string[][],
  tone = "NEUTRE",
) {
  return {
    titre,
    tone,
    colonnes,
    lignes: lignes.length > 0 ? lignes : [colonnes.map(() => "Néant")],
  };
}

function toTextSection(titre: string, texte?: string | null, tone = "NEUTRE") {
  return {
    titre,
    tone,
    texte: valueOrNeant(texte),
    lignes: [valueOrNeant(texte)],
  };
}

function formatConformite(value?: string | null) {
  switch (value) {
    case "SATISFAISANT":
      return "Satisfaisant";
    case "PREOCCUPANT":
      return "Préoccupant";
    case "A_SURVEILLER":
      return "À surveiller";
    default:
      return "Néant";
  }
}

function formatAlertStatut(value?: string | null) {
  switch (value) {
    case "OUVERTE":
      return "Non traitée";
    case "TRAITEE":
      return "Traitée";
    case "IGNOREE":
      return "Ignorée";
    default:
      return valueOrNeant(value);
  }
}

function formatPointagePresence(statut?: string | null) {
  switch (statut) {
    case "VALIDE":
      return "Présent";
    case "ABSENT":
    case "REFUSE":
      return "Absent";
    default:
      return "Néant";
  }
}

function formatObligationStatut(statut?: string | null) {
  switch (statut) {
    case "RESPECTEE":
      return "Respectée";
    case "NON_RESPECTEE":
      return "Non respectée";
    default:
      return "Néant";
  }
}

function normalizeDraftStatut(statut?: string | null) {
  return statut === "NON_RESPECTEE" ? "NON_RESPECTEE" : "RESPECTEE";
}

function buildObligationsDraft(
  obligations: Array<{
    id: string;
    categorie?: { nom: string } | null;
    type?: string | null;
    libelle?: string | null;
    description?: string | null;
  }>,
  existing?: Array<{ obligationId: string; statut?: string | null; commentaire?: string | null }>,
) {
  const existingById = new Map((existing ?? []).map((item) => [item.obligationId, item]));

  return obligations.map((obligation) => {
    const current = existingById.get(obligation.id);

    return {
      obligationId: obligation.id,
      categorie: valueOrNeant(obligation.categorie?.nom ?? obligation.type),
      libelle: valueOrNeant(obligation.libelle ?? obligation.description),
      statut: normalizeDraftStatut(current?.statut),
      commentaire: current?.commentaire ?? "",
    };
  });
}

function applyDraftToRapportContent(rawContent: unknown, draft: {
  obligations: Array<{
    obligationId: string;
    categorie: string;
    libelle: string;
    statut: string;
    commentaire?: string | null;
  }>;
  commentaireGeneral?: string | null;
}) {
  const content = asRecord(rawContent) ?? {};
  const sections = Array.isArray(content.sections) ? [...content.sections] : [];
  const obligationRows = draft.obligations.map((obligation) => [
    obligation.categorie,
    obligation.libelle,
    formatObligationStatut(obligation.statut),
  ]);
  const comments = [
    draft.commentaireGeneral?.trim(),
    ...draft.obligations
      .map((obligation) => obligation.commentaire?.trim())
      .filter(Boolean)
      .map((comment) => `- ${comment}`),
  ].filter(Boolean);

  const nextSections = sections.map((section) => {
    const record = asRecord(section);
    if (!record) return section;
    const titre = asText(record.titre)?.toLowerCase() ?? "";

    if (titre.includes("obligation")) {
      return toTableSection("Obligations", ["Catégorie", "Libellé", "Statut"], obligationRows);
    }

    if (titre.includes("commentaire")) {
      return toTextSection("Commentaires", comments.join("\n") || null);
    }

    return section;
  });

  return {
    ...content,
    draft: {
      ...(asRecord(content.draft) ?? {}),
      obligations: draft.obligations,
      commentaireGeneral: draft.commentaireGeneral ?? "",
    },
    sections: nextSections,
  };
}

function buildPeriodWhere(periodeDu?: Date, periodeAu?: Date) {
  if (!periodeDu && !periodeAu) {
    return undefined;
  }

  return {
    ...(periodeDu ? { gte: periodeDu } : {}),
    ...(periodeAu ? { lte: periodeAu } : {}),
  };
}

function mapRapport(rapport: Prisma.RapportGetPayload<{
  include: {
    generePar: {
      select: {
        id: true;
        nom: true;
        prenom: true;
        email: true;
      };
    };
    beneficiaire: {
      select: {
        id: true;
        statut: true;
        dossier: {
          select: {
            id: true;
            numeroDossier: true;
            numeroMandatDepot: true;
            nom: true;
            prenom: true;
          };
        };
      };
    };
  };
}>) {
  return {
    id: rapport.id,
    type: rapport.type,
    titre: rapport.titre,
    statut: rapport.statut,
    contenu: rapport.contenu,
    periodeDu: formatDate(rapport.periodeDu),
    periodeAu: formatDate(rapport.periodeAu),
    fichierUrl: rapport.fichierUrl,
    createdAt: rapport.createdAt.toISOString(),
    beneficiaire: {
      id: rapport.beneficiaire.id,
      statut: rapport.beneficiaire.statut,
      dossier: rapport.beneficiaire.dossier
        ? {
            id: rapport.beneficiaire.dossier.id,
            numeroDossier: rapport.beneficiaire.dossier.numeroDossier,
            numeroMandatDepot: rapport.beneficiaire.dossier.numeroMandatDepot,
            nom: rapport.beneficiaire.dossier.nom,
            prenom: rapport.beneficiaire.dossier.prenom,
          }
        : null,
    },
    generePar: {
      id: rapport.generePar.id,
      nom: rapport.generePar.nom,
      prenom: rapport.generePar.prenom,
      email: rapport.generePar.email,
    },
  };
}

export async function createPrefilledRapport(
  input: CreatePrefilledRapportInput,
  user?: AuthenticatedUser,
) {
  if (!user) {
    throw new HttpError(401, "Authentification requise");
  }

  const data = CreatePrefilledRapportSchema.parse(input);
  const scope = resolveScope(user);
  const periodeDu = parseDate(data.periodeDu);
  const periodeAu = parseDate(data.periodeAu);

  if (periodeDu && periodeAu && periodeDu > periodeAu) {
    throw new HttpError(400, "La date de debut doit etre anterieure a la date de fin");
  }

  const pointageDateWhere = buildPeriodWhere(periodeDu, periodeAu);
  const evaluationDateWhere = buildPeriodWhere(periodeDu, periodeAu);

  const beneficiaire = await prisma.beneficiaire.findFirst({
    where: {
      id: data.beneficiaireId,
      ...buildBeneficiaireScopeWhere(scope),
    },
    include: {
      dossier: {
        include: {
          juridiction: true,
        },
      },
      obligations: {
        include: {
          categorie: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      pointages: {
        where: pointageDateWhere ? { dateHeure: pointageDateWhere } : undefined,
        orderBy: { dateHeure: "desc" },
        take: 12,
      },
      alertes: {
        where: pointageDateWhere ? { createdAt: pointageDateWhere } : undefined,
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      documents: {
        where: {
          statut: "UPLOADED",
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 8,
      },
      evaluationsServicesExternes: {
        where: evaluationDateWhere ? { periodeMois: evaluationDateWhere } : undefined,
        include: {
          service: true,
          affectation: true,
          occurrences: {
            orderBy: {
              dateSuivi: "asc",
            },
          },
        },
        orderBy: [{ periodeMois: "desc" }, { createdAt: "desc" }],
        take: 8,
      },
    },
  });

  if (!beneficiaire) {
    throw new HttpError(404, "Beneficiaire introuvable");
  }

  const dossier = beneficiaire.dossier;
  const fullName = formatPersonName(dossier);
  const title = `Rapport ${data.type.toLowerCase()} - ${fullName}`;
  const pointagesAbsents = beneficiaire.pointages.filter((pointage) => pointage.statut === "ABSENT").length;
  const alertesOuvertes = beneficiaire.alertes.filter((alerte) => alerte.statut === "OUVERTE").length;
  const evaluationsPreoccupantes = beneficiaire.evaluationsServicesExternes.filter(
    (evaluation) => evaluation.conformite === "PREOCCUPANT",
  ).length;

  const evaluationRows = beneficiaire.evaluationsServicesExternes.flatMap((evaluation) => {
    const summaryRow = {
      type: "evaluation",
      cellules: [
        valueOrNeant(evaluation.affectation.typeSuivi ?? evaluation.affectation.libelleSuivi),
        valueOrNeant(evaluation.service.nom),
        formatConformite(evaluation.conformite),
      ],
    };

    const occurrenceRows = evaluation.occurrences.length > 0
      ? evaluation.occurrences.map((occurrence) => ({
          type: "presence",
          cellules: [
            valueOrNeant(formatDate(occurrence.dateSuivi)),
            occurrence.present ? "Présent" : "Absent",
          ],
        }))
      : [
          {
            type: "presence",
            cellules: [
              valueOrNeant(formatDate(evaluation.dateConstat)),
              evaluation.present ? "Présent" : "Absent",
            ],
          },
        ];

    return [summaryRow, ...occurrenceRows];
  });

  const contenu = {
    version: 1,
    genereLe: new Date().toISOString(),
    draft: {
      obligations: buildObligationsDraft(beneficiaire.obligations),
      commentaireGeneral: "",
    },
    resume: {
      beneficiaire: fullName,
      dossier: valueOrNeant(dossier?.numeroDossier),
      mandatDepot: valueOrNeant(dossier?.numeroMandatDepot),
      juridiction: valueOrNeant(dossier?.juridiction?.nom ?? dossier?.juridictionId),
      statut: beneficiaire.profilStatut ?? beneficiaire.statut,
      periodeDu: formatDate(periodeDu),
      periodeAu: formatDate(periodeAu),
      indicateurs: {
        obligations: beneficiaire.obligations.length,
        pointages: beneficiaire.pointages.length,
        pointagesAbsents,
        alertes: beneficiaire.alertes.length,
        alertesOuvertes,
        evaluations: beneficiaire.evaluationsServicesExternes.length,
        evaluationsPreoccupantes,
        documents: beneficiaire.documents.length,
      },
    },
    sections: [
      toTableSection(
        "Pointage",
        ["Date", "Présence", "Lieu"],
        beneficiaire.pointages.map((pointage) => [
          valueOrNeant(pointage.dateHeure.toISOString().slice(0, 10)),
          formatPointagePresence(pointage.statut),
          valueOrNeant(pointage.lieu ?? pointage.centreNom),
        ]),
        pointagesAbsents > 0 ? "ALERTE" : "NEUTRE",
      ),
      {
        titre: "Évaluations",
        tone: evaluationsPreoccupantes > 0 ? "ALERTE" : "NEUTRE",
        lignes: evaluationRows.length > 0 ? evaluationRows : [{ type: "empty", cellules: ["Néant"] }],
      },
      toTableSection(
        "Alertes",
        ["Date", "Type de l'alerte", "État"],
        beneficiaire.alertes.map((alerte) => [
          valueOrNeant(alerte.createdAt.toISOString().slice(0, 10)),
          valueOrNeant(alerte.type),
          formatAlertStatut(alerte.statut),
        ]),
        alertesOuvertes > 0 ? "ALERTE" : "NEUTRE",
      ),
      toTableSection(
        "Obligations",
        ["Catégorie", "Libellé", "Statut"],
        buildObligationsDraft(beneficiaire.obligations).map((obligation) => [
          obligation.categorie,
          obligation.libelle,
          formatObligationStatut(obligation.statut),
        ]),
      ),
      toTextSection(
        "Commentaires",
        alertesOuvertes > 0 || evaluationsPreoccupantes > 0
          ? "Des éléments de vigilance sont présents. Une analyse par l'agent est requise avant finalisation."
          : null,
        alertesOuvertes > 0 || evaluationsPreoccupantes > 0 ? "ALERTE" : "NEUTRE",
      ),
    ],
  };

  const rapport = await prisma.rapport.create({
    data: {
      beneficiaireId: beneficiaire.id,
      generepar: user.id,
      type: data.type,
      titre: title,
      statut: "BROUILLON",
      periodeDu,
      periodeAu,
      contenu,
    },
    include: {
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
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
            },
          },
        },
      },
    },
  });

  return mapRapport(rapport);
}

export async function listRapportsRediges(user?: AccessContext) {
  const scope = resolveScope(user);

  const rapports = await prisma.rapport.findMany({
    where: {
      beneficiaire: {
        is: buildBeneficiaireScopeWhere(scope),
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
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
            },
          },
        },
      },
    },
  });

  return rapports.map(mapRapport);
}

async function getRapportForWriteOrThrow(id: string, user?: AccessContext) {
  const scope = resolveScope(user);

  return prisma.rapport.findFirstOrThrow({
    where: {
      id,
      beneficiaire: {
        is: buildBeneficiaireScopeWhere(scope),
      },
    },
    include: {
      beneficiaire: {
        include: {
          dossier: {
            select: {
              id: true,
              numeroDossier: true,
              numeroMandatDepot: true,
              nom: true,
              prenom: true,
            },
          },
          obligations: {
            include: {
              categorie: true,
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      },
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
    },
  });
}

export async function updateDraftRapport(
  id: string,
  input: UpdateDraftRapportInput,
  user?: AccessContext,
) {
  const data = UpdateDraftRapportSchema.parse(input);
  const rapport = await getRapportForWriteOrThrow(id, user);

  if (rapport.statut === "FINALISE") {
    throw new HttpError(409, "Ce rapport est deja finalise");
  }

  const submittedById = new Map(
    (data.obligations ?? []).map((item) => [item.obligationId, item]),
  );
  const currentDraft = asRecord(rapport.contenu)?.draft;
  const currentObligations = Array.isArray(asRecord(currentDraft)?.obligations)
    ? (asRecord(currentDraft)?.obligations as Array<{
        obligationId: string;
        statut?: string | null;
        commentaire?: string | null;
      }>)
    : [];
  const currentById = new Map(currentObligations.map((item) => [item.obligationId, item]));

  const obligations = rapport.beneficiaire.obligations.map((obligation) => {
    const submitted = submittedById.get(obligation.id);
    const current = currentById.get(obligation.id);

    return {
      obligationId: obligation.id,
      categorie: valueOrNeant(obligation.categorie?.nom ?? obligation.type),
      libelle: valueOrNeant(obligation.libelle ?? obligation.description),
      statut: normalizeDraftStatut(submitted?.statut ?? current?.statut),
      commentaire: submitted?.commentaire ?? current?.commentaire ?? "",
    };
  });

  const nextContent = applyDraftToRapportContent(rapport.contenu, {
    obligations,
    commentaireGeneral:
      data.commentaireGeneral ??
      asText(asRecord(currentDraft)?.commentaireGeneral) ??
      "",
  });

  const updated = await prisma.rapport.update({
    where: { id },
    data: {
      contenu: nextContent as Prisma.InputJsonValue,
    },
    include: {
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
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
            },
          },
        },
      },
    },
  });

  return mapRapport(updated);
}

export async function finalizeRapport(
  id: string,
  input: UpdateDraftRapportInput,
  user?: AccessContext,
) {
  await updateDraftRapport(id, input, user);
  const scope = resolveScope(user);
  const updated = await prisma.rapport.update({
    where: { id },
    data: {
      statut: "FINALISE",
    },
    include: {
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
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
            },
          },
        },
      },
    },
  });

  if (scope.jurisdictionId && updated.beneficiaire.dossier?.id) {
    await prisma.dossier.findFirstOrThrow({
      where: {
        id: updated.beneficiaire.dossier.id,
        ...buildDossierScopeWhere(scope),
      },
    });
  }

  return mapRapport(updated);
}

export async function reopenRapportDraft(id: string, user?: AccessContext) {
  await getRapportForWriteOrThrow(id, user);

  const updated = await prisma.rapport.update({
    where: { id },
    data: {
      statut: "BROUILLON",
    },
    include: {
      generePar: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
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
            },
          },
        },
      },
    },
  });

  return mapRapport(updated);
}

export async function listEvaluationsRecues(user?: AccessContext) {
  const scope = resolveScope(user);

  const evaluations = await prisma.evaluationServiceExterne.findMany({
    where: {
      beneficiaire: {
        is: buildBeneficiaireScopeWhere(scope),
      },
    },
    orderBy: [{ periodeMois: "desc" }, { createdAt: "desc" }],
    include: {
      service: {
        select: {
          id: true,
          nom: true,
          type: true,
          email: true,
        },
      },
      affectation: {
        select: {
          id: true,
          typeSuivi: true,
          libelleSuivi: true,
          codeSuivi: true,
        },
      },
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
    },
  });

  return evaluations.map((evaluation) => ({
    id: evaluation.id,
    affectationId: evaluation.affectationId,
    serviceId: evaluation.serviceId,
    beneficiaireId: evaluation.beneficiaireId,
    obligationId: evaluation.obligationId,
    periodeMois: evaluation.periodeMois.toISOString().slice(0, 10),
    frequenceSuivi: evaluation.frequenceSuivi,
    dateConstat: evaluation.dateConstat.toISOString().slice(0, 10),
    present: evaluation.present,
    conformite: evaluation.conformite,
    observations: evaluation.observations,
    commentaire: evaluation.commentaire,
    createdAt: evaluation.createdAt.toISOString(),
    updatedAt: evaluation.updatedAt.toISOString(),
    service: {
      id: evaluation.service.id,
      nom: evaluation.service.nom,
      type: evaluation.service.type,
      email: evaluation.service.email,
    },
    affectation: {
      id: evaluation.affectation.id,
      typeSuivi: evaluation.affectation.typeSuivi,
      libelleSuivi: evaluation.affectation.libelleSuivi,
      codeSuivi: evaluation.affectation.codeSuivi,
    },
    beneficiaire: {
      id: evaluation.beneficiaire.id,
      statut: evaluation.beneficiaire.statut,
      dossier: evaluation.beneficiaire.dossier
        ? {
            id: evaluation.beneficiaire.dossier.id,
            numeroDossier: evaluation.beneficiaire.dossier.numeroDossier,
            numeroMandatDepot: evaluation.beneficiaire.dossier.numeroMandatDepot,
            nom: evaluation.beneficiaire.dossier.nom,
            prenom: evaluation.beneficiaire.dossier.prenom,
            juridictionId: evaluation.beneficiaire.dossier.juridictionId,
          }
        : null,
    },
    occurrences: evaluation.occurrences.map((occurrence) => ({
      id: occurrence.id,
      dateSuivi: occurrence.dateSuivi.toISOString().slice(0, 10),
      present: occurrence.present,
    })),
    documents: evaluation.documents.map((document) => ({
      id: document.id,
      typeDocument: document.typeDocument,
      titre: document.titre,
      description: document.description,
      fileName: document.fileName,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      downloadUrl: `/documents/${document.id}/download`,
      portalDownloadUrl: `/portail/evaluations/${evaluation.id}/documents/${document.id}/download`,
    })),
    obligation: evaluation.obligation
      ? {
          id: evaluation.obligation.id,
          type: evaluation.obligation.type,
          description: evaluation.obligation.description,
          frequence: evaluation.obligation.frequence,
          lieu: evaluation.obligation.lieu,
          categorie: evaluation.obligation.categorie
            ? {
                id: evaluation.obligation.categorie.id,
                nom: evaluation.obligation.categorie.nom,
              }
            : null,
        }
      : null,
  }));
}

export async function listDocumentsRecus(user?: AccessContext) {
  const scope = resolveScope(user);

  const [documents, beneficiaires] = await prisma.$transaction([
    prisma.document.findMany({
      where: {
        statut: "UPLOADED",
        beneficiaire: {
          is: buildBeneficiaireScopeWhere(scope),
        },
      },
      orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
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
              },
            },
          },
        },
      },
    }),
    prisma.beneficiaire.findMany({
      where: buildBeneficiaireScopeWhere(scope),
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
            createdAt: true,
            othersData: true,
          },
        },
      },
    }),
  ]);

  const storedDocuments = documents.map((document) => ({
    id: document.id,
    source: document.source,
    origin: "SCBAP",
    typeDocument: document.typeDocument,
    titre: document.titre,
    description: document.description,
    fileName: document.fileName,
    mimeType: document.mimeType,
    statut: document.statut,
    uploadedAt: document.uploadedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    previewUrl: `/documents/${document.id}/download`,
    downloadUrl: `/documents/${document.id}/download`,
    beneficiaire: {
      id: document.beneficiaire.id,
      statut: document.beneficiaire.statut,
      dossier: document.beneficiaire.dossier
        ? {
            id: document.beneficiaire.dossier.id,
            numeroDossier: document.beneficiaire.dossier.numeroDossier,
            numeroMandatDepot: document.beneficiaire.dossier.numeroMandatDepot,
            nom: document.beneficiaire.dossier.nom,
            prenom: document.beneficiaire.dossier.prenom,
          }
        : null,
    },
  }));

  const externalDocuments = beneficiaires.flatMap((beneficiaire) => {
    const dossier = beneficiaire.dossier;
    const othersData = asRecord(dossier?.othersData);

    if (!dossier || !othersData) {
      return [];
    }

    const results: Array<Record<string, unknown>> = [];

    const pushRecord = (
      record: Record<string, unknown>,
      kind: string,
      fallbackTitle: string,
      index: number,
    ) => {
      const href = getDocumentLink(record) ?? (kind === "ARRETE" ? findDocumentLink(othersData) : undefined);
      results.push({
        id: `dapg:${beneficiaire.id}:${kind}:${index}`,
        source: "DAPG",
        origin: "DAPG",
        typeDocument: kind,
        titre: getDocumentTitle(record, fallbackTitle),
        description:
          [asText(record.statut), asText(record.description), asText(record.observation)]
            .filter(Boolean)
            .join(" • ") || null,
        fileName: asText(record.nom_fichier) ?? asText(record.file_name) ?? null,
        mimeType: asText(record.mime_type) ?? "application/pdf",
        statut: asText(record.statut) ?? "RECU",
        uploadedAt:
          normalizeDateTime(asText(record.created_at)) ??
          normalizeDateTime(asText(record.createdAt)) ??
          normalizeDateTime(asText(record.date)) ??
          normalizeDateTime(asText(record.date_arrete)) ??
          dossier.createdAt.toISOString(),
        createdAt:
          normalizeDateTime(asText(record.created_at)) ??
          normalizeDateTime(asText(record.createdAt)) ??
          normalizeDateTime(asText(record.date)) ??
          normalizeDateTime(asText(record.date_arrete)) ??
          dossier.createdAt.toISOString(),
        previewUrl: href,
        downloadUrl: href,
        beneficiaire: {
          id: beneficiaire.id,
          statut: beneficiaire.statut,
          dossier: {
            id: dossier.id,
            numeroDossier: dossier.numeroDossier,
            numeroMandatDepot: dossier.numeroMandatDepot,
            nom: dossier.nom,
            prenom: dossier.prenom,
          },
        },
      });
    };

    const arrete = asRecord(othersData.arrete);
    if (arrete) {
      pushRecord(arrete, "ARRETE", "Arrêté ministériel", 0);
    }

    const tousArretes = Array.isArray(othersData.tousArretes)
      ? (othersData.tousArretes as unknown[])
      : [];
    tousArretes.forEach((item, index) => {
      const record = asRecord(item);
      if (record) {
        pushRecord(record, "ARRETE", `Arrêté ${index + 1}`, index + 1);
      }
    });

    const justificatifs = Array.isArray(othersData.documentsJustificatifs)
      ? (othersData.documentsJustificatifs as unknown[])
      : [];
    justificatifs.forEach((item, index) => {
      const record = asRecord(item);
      if (record) {
        pushRecord(record, "JUSTIFICATIF", `Document ${index + 1}`, index + 1);
      }
    });

    return results as Array<{
      id: string;
      source: string;
      origin: string;
      typeDocument: string;
      titre: string;
      description: string | null;
      fileName: string | null;
      mimeType: string | null;
      statut: string;
      uploadedAt: string | null;
      createdAt: string;
      previewUrl?: string;
      downloadUrl?: string;
      beneficiaire: {
        id: string;
        statut: string;
        dossier: {
          id: string;
          numeroDossier: string;
          numeroMandatDepot: string;
          nom: string;
          prenom: string;
        };
      };
    }>;
  });

  return [...storedDocuments, ...externalDocuments].sort((left, right) => {
    const leftTime = new Date(left.uploadedAt || left.createdAt).getTime();
    const rightTime = new Date(right.uploadedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

export async function generateMonthlyDraftRapportsForActiveBeneficiaires(referenceDate = new Date()) {
  const systemUser = await prisma.user.findFirst({
    where: {
      role: {
        nom: "ADMIN",
      },
      statut: "ACTIF",
    },
    include: {
      role: true,
      structure: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!systemUser) {
    return { generated: 0, skipped: 0, reason: "NO_ACTIVE_ADMIN" };
  }

  const periodeDu = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const periodeAu = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0));
  const activeBeneficiaires = await prisma.beneficiaire.findMany({
    where: {
      profilStatut: "ACTIF",
      dossier: {
        is: {
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
    },
  });

  let generated = 0;
  let skipped = 0;

  for (const beneficiaire of activeBeneficiaires) {
    const existing = await prisma.rapport.findFirst({
      where: {
        beneficiaireId: beneficiaire.id,
        type: "MENSUEL",
        periodeDu,
        periodeAu,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await createPrefilledRapport(
      {
        beneficiaireId: beneficiaire.id,
        type: "MENSUEL",
        periodeDu: periodeDu.toISOString().slice(0, 10),
        periodeAu: periodeAu.toISOString().slice(0, 10),
      },
      systemUser as unknown as AuthenticatedUser,
    );
    generated += 1;
  }

  return { generated, skipped };
}
