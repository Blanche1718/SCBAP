import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
    CreateBeneficiaireSchema,
    UpdateBeneficiaireSchema,

} from "../schemas/beneficiaire.schema";
import { z } from "zod";

type CreateBeneficiaireInput = z.infer<typeof CreateBeneficiaireSchema>;
type UpdateBeneficiaireInput = z.infer<typeof UpdateBeneficiaireSchema>;
type SpecificObligationInput = {
    categorie: string;
    libelle: string;
    code?: string;
    section?: string;
    type?: string;
    frequence?: string;
    jourSemaine?: string;
    heure?: string;
    lieu?: string;
};

// SERVICE DE RECUPERATION DES BENEFICIAIRES
export async function getBeneficiaires(page = 1, limit = 10) {
    if (page <= 0 || limit <= 0) {
        throw new HttpError(400, "Parametres de pagination invalides");
    }

    const skip = (page - 1) * limit;
    const [beneficiaires, total] = await prisma.$transaction([
        prisma.beneficiaire.findMany({
            include: {
                dossier: true,
                obligations: true,
                pointages: {
                    orderBy: { dateHeure: "desc" },
                    take: 1,
                },
                
            },
            where: {
                dossier: {
                    deletedAt: null,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        }),
        prisma.beneficiaire.count(),
    ]);

    return {
        data: beneficiaires,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// SERVICE DE RECUPERATION D'UN BENEFICIAIRE PAR SON ID
export async function getBeneficiaireById(id: string) {
    return prisma.beneficiaire.findUniqueOrThrow({
        where: { id },
        include: {
            dossier: true,
            obligations: {
                orderBy: [
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
                include: {
                    categorie: true,
                },
            },
            pointages: {
                orderBy: { dateHeure: "desc" },
                take: 5,
            },
            alertes: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    });
}

// SERVICE DE CREATION D'UN BENEFICIAIRE
export async function createBeneficiaire(input: CreateBeneficiaireInput) {
    const data = CreateBeneficiaireSchema.parse(input);

    const dossier = await prisma.dossier.findFirstOrThrow({
        where: { id: data.dossierId, deletedAt: null },
        include: { 
            beneficiaire: true


         },
    });

    if (dossier.beneficiaire) {
        throw new HttpError(409, "Ce dossier a deja un beneficiaire");
    }

    return prisma.beneficiaire.create({
        data,
    });
}

export async function confirmBeneficiaireProfil(id: string) {
    await prisma.beneficiaire.findUniqueOrThrow({
        where: { id },
    });

    return prisma.beneficiaire.update({
        where: { id },
        data: {
            profilConfirme: true,
            profilConfirmeLe: new Date(),
        },
        include: {
            dossier: true,
            obligations: {
                include: {
                    categorie: true,
                },
            },
            pointages: {
                orderBy: { dateHeure: "desc" },
                take: 5,
            },
            alertes: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    });
}

async function ensureObligationCategoryExists(categorieNom: string) {
    const existing = await prisma.categorieObligation.findFirst({
        where: {
            nom: {
                equals: categorieNom,
                mode: "insensitive",
            },
        },
    });

    if (existing) {
        return existing;
    }

    return prisma.categorieObligation.create({
        data: {
            nom: categorieNom,
            description: `Categorie synchronisee depuis la DAPG: ${categorieNom}`,
        },
    });
}

export async function syncSpecificObligationsForBeneficiaire(
    beneficiaireId: string,
    obligations: SpecificObligationInput[],
) {
    const beneficiaire = await prisma.beneficiaire.findUniqueOrThrow({
        where: { id: beneficiaireId },
        include: {
            dossier: true,
        },
    });

    if (beneficiaire.profilConfirme) {
        throw new HttpError(409, "Le profil est deja confirme");
    }

    await prisma.obligation.deleteMany({
        where: {
            beneficiaireId,
            source: "DAPG_SPECIFIC",
        },
    });

    const created = [];

    for (const obligation of obligations) {
        const categorie = await ensureObligationCategoryExists(obligation.categorie);

        created.push(
            await prisma.obligation.create({
                data: {
                    beneficiaireId,
                    dossierId: beneficiaire.dossierId,
                    categorieId: categorie.id,
                    source: "DAPG_SPECIFIC",
                    description: obligation.libelle,
                    type: obligation.type ?? obligation.categorie,
                    frequence: obligation.frequence,
                    jourSemaine: obligation.jourSemaine,
                    heure: obligation.heure ? new Date(`1970-01-01T${obligation.heure.length === 5 ? `${obligation.heure}:00` : obligation.heure}Z`) : undefined,
                    lieu: obligation.lieu,
                    statutStructuration: "A_VERIFIER",
                    statut: "EN_COURS",
                    metadata: {
                        source: "dapg_specific",
                        code: obligation.code ?? null,
                        section: obligation.section ?? null,
                        categorie: obligation.categorie,
                        libelle: obligation.libelle,
                    },
                },
                include: {
                    categorie: true,
                },
            }),
        );
    }

    return created;
}

export async function updateBeneficiaireProfilLock(id: string, confirmed: boolean) {
    await prisma.beneficiaire.findUniqueOrThrow({
        where: { id },
    });

    return prisma.beneficiaire.update({
        where: { id },
        data: {
            profilConfirme: confirmed,
            profilConfirmeLe: confirmed ? new Date() : null,
        },
    });
}

// SERVICE DE MISE A JOUR D'UN BENEFICIAIRE
export async function updateBeneficiaire(id: string, input: UpdateBeneficiaireInput) {
    const data = UpdateBeneficiaireSchema.parse(input);

    await prisma.beneficiaire.findUniqueOrThrow({
        where: { id },
    });

    if (data.dossierId !== undefined) {
        const dossier = await prisma.dossier.findFirstOrThrow({
            where: { id: data.dossierId, deletedAt: null },
            include: { beneficiaire: true },
        });

        if (dossier.beneficiaire && dossier.beneficiaire.id !== id) {
            throw new HttpError(409, "Ce dossier a deja un beneficiaire");
        }
    }

    return prisma.beneficiaire.update({
        where: { id },
        data,
    });
}   
