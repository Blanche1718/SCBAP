
// IMPORTS
import { randomUUID } from "node:crypto";
import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import { DossierSchema, UpdateDossierSchema } from "../schemas/dossier.schema";
import { z } from "zod";

// TYPE TYPESCRIPT basé sur Zod
type CreateDossierInput = z.infer<typeof DossierSchema>;
type UpdateDossierInput = z.infer<typeof UpdateDossierSchema>;


// GENERATION QR CODE
function generateQrCode(numeroDossier: string) {
  return `BEN-${numeroDossier}-${randomUUID().slice(0, 8)}`;
}
// FONCTION DE PARSING DE LA DATE
function parseDate(date?: string) {
  if (!date) return null;

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    throw new HttpError(400, "Date invalide");
  }

  return parsed;
}


// SERVICE DE CREATION DE DOSSIER ET BENEFICIAIRE

export async function createDossier(input: CreateDossierInput) {

  // VALIDATION DES DONNÉES
  const data = DossierSchema.parse(input);

  // TRANSACTION
  return prisma.$transaction(async (tx) => {

    //  CREATION DOSSIER
    const dossier = await tx.dossier.create({
      data: {
        numeroDossier: data.numero_dossier,
        juridictionId: data.juridiction_id,
        prisonId: data.prison_id,
        nom: data.nom,
        prenom: data.prenom,

        dateNaissance: parseDate(data.date_naissance),
        lieuNaissance: data.lieu_naissance,
        nationalite: data.nationalite,
        sexe: data.sexe,
        profession: data.profession,
        adresse: data.adresse,
        telephoneContact: data.telephone_contact,

        infractions: data.infractions,
        numeroMandatDepot: data.numero_mandat_depot,

        dateMandatDepot: parseDate(data.date_mandat_depot),
        condamnation: data.condamnation,

        dateFinPeine: parseDate(data.date_fin_peine),

        dureePeineMois: data.duree_peine_mois,
        observations: data.observations,
        obligations: data.obligations,
        othersData: data.others_data,
       // statut provenant de la DAPG (non utilisé par le système)
        statut: data.statut,
      },
    });

 // CREATION BENEFICIAIRE
    const beneficiaire = await tx.beneficiaire.create({
      data: {
        dossierId: dossier.id,
        statut: "ACTIF",
        qrCode: generateQrCode(data.numero_dossier),
      },
    });


    
    // RETOURNER LES DONNÉES 
    return {
      dossier,
      beneficiaire,
    };
  });
}

// SERVICE DE RECUPERATION DES DOSSIERS

export async function getDossiers(page = 1, limit = 10) {
  const skip = (page-1)*limit;
  const [dossiers, total] = await prisma.$transaction([
    prisma.dossier.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        beneficiaire: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.dossier.count({
      where: {
        deletedAt: null,
      },
    }),
  ]);

  return {
    data: dossiers,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
 



// SERVICE DE RECUPERATION D'UN DOSSIER PAR SON ID
export async function getDossierById(id: number) {
  return prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      beneficiaire: true,
    },
  });
}

export async function updateDossier(id: number, input: UpdateDossierInput) {
  const data = UpdateDossierSchema.parse(input);

  await prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
    },
  });

  const rawData = {
    numeroDossier: data.numero_dossier,
    juridictionId: data.juridiction_id,
    prisonId: data.prison_id,
    nom: data.nom,
    prenom: data.prenom,
    dateNaissance: data.date_naissance
      ? parseDate(data.date_naissance)
      : undefined,
    lieuNaissance: data.lieu_naissance,
    nationalite: data.nationalite,
    sexe: data.sexe,
    profession: data.profession,
    adresse: data.adresse,
    telephoneContact: data.telephone_contact,
    infractions: data.infractions,
    numeroMandatDepot: data.numero_mandat_depot,
    dateMandatDepot: data.date_mandat_depot
      ? parseDate(data.date_mandat_depot)
      : undefined,
    condamnation: data.condamnation,
    dateFinPeine: data.date_fin_peine
      ? parseDate(data.date_fin_peine)
      : undefined,
    dureePeineMois: data.duree_peine_mois,
    observations: data.observations,
    obligations: data.obligations,
    othersData: data.others_data,
    statut: data.statut,
  };

  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([_, value]) => value !== undefined)
  );

  return prisma.dossier.update({
    where: { id },
    data: cleanData,
    include: {
      beneficiaire: true,
    },
  });
}

export async function softDeleteDossier(id: number) {
  await prisma.dossier.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
    },
  });

  return prisma.dossier.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
    include: {
      beneficiaire: true,
    },
  });
}
