
// IMPORTS
import { randomUUID } from "node:crypto";
import prisma from "../prisma";
import { DossierSchema } from "../schemas/dossier.schema";
import { z } from "zod";

// TYPE TYPESCRIPT basé sur Zod
type CreateDossierInput = z.infer<typeof DossierSchema>;


// GENERATION QR CODE
function generateQrCode(numeroDossier: string) {
  return `QR-${numeroDossier}-${Date.now()}-${randomUUID()}`;
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

        dateNaissance: data.date_naissance
          ? new Date(data.date_naissance)
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
          ? new Date(data.date_mandat_depot)
          : undefined,

        condamnation: data.condamnation,

        dateFinPeine: data.date_fin_peine
          ? new Date(data.date_fin_peine)
          : undefined,

        dureePeineMois: data.duree_peine_mois,
        observations: data.observations,
        obligations: data.obligations,
        othersData: data.others_data,

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

export async function getDossiers() {
  return prisma.dossier.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      beneficiaire: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
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

