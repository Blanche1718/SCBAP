import { Prisma } from "@prisma/client";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
  CreateObligationSchema,
  UpdateObligationSchema,
  ValidateObligationSchema,
} from "../schemas/obligation.schema";
import { z } from "zod";

type CreateObligationInput = z.infer<typeof CreateObligationSchema>;
type UpdateObligationInput = z.infer<typeof UpdateObligationSchema>;
type ValidateObligationInput = z.infer<typeof ValidateObligationSchema>;
type DossierWithBeneficiaire = Prisma.DossierGetPayload<{
  include: { beneficiaire: true };
}> & {
  beneficiaire: NonNullable<
    Prisma.DossierGetPayload<{ include: { beneficiaire: true } }>["beneficiaire"]
  >;
};
// Fonctions pour parser la date
function parseDate(date?: string) {
  if (!date) return null;

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    throw new HttpError(400, "Date d'obligation invalide");
  }

  return parsed;
}
// Foynction pour parser l'heure au format HH:mm ou HH:mm:ss
function parseTime(time?: string) {
  if (!time) return null;

  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const parsed = new Date(`1970-01-01T${normalizedTime}Z`);

  if (isNaN(parsed.getTime())) {
    throw new HttpError(400, "Heure d'obligation invalide");
  }

  return parsed;
}
// Fonction pour supprimer les propriétés undefined d'un objet
function removeUndefinedValues<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined),
  );
}

// fonction pour s'assurer que la catégorie d'obligation existe
async function ensureCategorieExists(categorieId: string) {
  const categorie = await prisma.categorieObligation.findUnique({
    where: { id: categorieId },
  });

  if (!categorie) {
    throw new HttpError(404, "Categorie d'obligation introuvable");
  }
}
// fonction pour récupérer un dossier avec son bénéficiaire ou lancer une erreur si le dossier n'existe pas ou n'a pas de bénéficiaire
async function getDossierWithBeneficiaireOrThrow(
  dossierId: string,
): Promise<DossierWithBeneficiaire> {
  const dossier = await prisma.dossier.findFirstOrThrow({
    where: {
      id: dossierId,
      deletedAt: null,
    },
    include: {
      beneficiaire: true,
    },
  });

  if (!dossier.beneficiaire) {
    throw new HttpError(400, "Ce dossier ne possede pas de beneficiaire");
  }

  return dossier as DossierWithBeneficiaire;
}
// Fonctions pour construire les données de création et de mise à jour d'une obligation en filtrant les propriétés undefined
function buildObligationCreateData(
  data: CreateObligationInput,
  options: {
    dossierId: string;
    beneficiaireId: string;
    statutStructuration: string;
  },
): Prisma.ObligationUncheckedCreateInput {
  return {
    dossierId: options.dossierId,
    beneficiaireId: options.beneficiaireId,
    categorieId: data.categorie_id,
    description: data.description,
    type: data.type,
    frequence: data.frequence,
    jourSemaine: data.jour_semaine,
    heure: parseTime(data.heure),
    lieu: data.lieu,
    metadata: data.metadata,
    statutStructuration: options.statutStructuration,
    dateDebut: parseDate(data.date_debut),
    dateFin: parseDate(data.date_fin),
    statut: data.statut,
    raisonModification: data.raison_modification,
    raisonAutre: data.raison_autre,
    modifiePar: data.modifie_par,
  };
}
// Fonction pour construire les données de mise à jour d'une obligation en filtrant les propriétés undefined
function buildObligationUpdateData(
  data: Partial<CreateObligationInput>,
): Prisma.ObligationUncheckedUpdateInput {
  const rawData = {
    categorieId: data.categorie_id,
    description: data.description,
    type: data.type,
    frequence: data.frequence,
    jourSemaine: data.jour_semaine,
    heure: data.heure !== undefined ? parseTime(data.heure) : undefined,
    lieu: data.lieu,
    metadata: data.metadata,
    statutStructuration: data.statut_structuration,
    dateDebut: data.date_debut !== undefined ? parseDate(data.date_debut) : undefined,
    dateFin: data.date_fin !== undefined ? parseDate(data.date_fin) : undefined,
    statut: data.statut,
    raisonModification: data.raison_modification,
    raisonAutre: data.raison_autre,
    modifiePar: data.modifie_par,
  };

  return removeUndefinedValues(
    rawData,
  ) as Prisma.ObligationUncheckedUpdateInput;
}

// Fonction pour récupérer les obligations d'un dossier
export async function getObligationsByDossier(dossierId: string) {
  await getDossierWithBeneficiaireOrThrow(dossierId);

  return prisma.obligation.findMany({
    where: {
      dossierId,
    },
    include: {
      beneficiaire: true,
      categorie: true,
      dossier: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
// Fonction pour récupérer une obligation par son id
export async function getObligationById(id: string) {
  return prisma.obligation.findUniqueOrThrow({
    where: { id },
    include: {
      beneficiaire: true,
      categorie: true,
      dossier: true,
    },
  });
}
// Fonction pour créer une obligation
export async function createObligation(dossierId: string, input: CreateObligationInput) {
  const data = CreateObligationSchema.parse(input);
  const dossier = await getDossierWithBeneficiaireOrThrow(dossierId);

  await ensureCategorieExists(data.categorie_id);

  return prisma.obligation.create({
    data: buildObligationCreateData(data, {
      dossierId: dossier.id,
      beneficiaireId: dossier.beneficiaire.id,
      statutStructuration: data.statut_structuration ?? "A_VERIFIER",
    }),
    include: {
      beneficiaire: true,
      categorie: true,
      dossier: true,
    },
  });
}
// Fonctyion pour mettre à jour une obligation
export async function updateObligation(id: string, input: UpdateObligationInput) {
  const data = UpdateObligationSchema.parse(input);

  await prisma.obligation.findUniqueOrThrow({
    where: { id },
  });

  if (data.categorie_id !== undefined) {
    await ensureCategorieExists(data.categorie_id);
  }

  const updateData = buildObligationUpdateData(data);
  const shouldValidate =
    data.statut_structuration === undefined &&
    (data.raison_modification !== undefined || data.raison_autre !== undefined);

  return prisma.obligation.update({
    where: { id },
    data: {
      ...updateData,
      statutStructuration: shouldValidate ? "VALIDE" : updateData.statutStructuration,
      modifieLe: new Date(),
    },
    include: {
      beneficiaire: true,
      categorie: true,
      dossier: true,
    },
  });
}
// Fonction pour valider une obligation
export async function validateObligation(
  id: string,
  input: ValidateObligationInput,
) {
  const data = ValidateObligationSchema.parse(input);

  await prisma.obligation.findUniqueOrThrow({
    where: { id },
  });

  if (data.categorie_id !== undefined) {
    await ensureCategorieExists(data.categorie_id);
  }

  return prisma.obligation.update({
    where: { id },
    data: {
      ...buildObligationUpdateData(data),
      statutStructuration: "VALIDE",
      modifieLe: new Date(),
    },
    include: {
      beneficiaire: true,
      categorie: true,
      dossier: true,
    },
  });
}
