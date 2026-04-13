import { HttpError } from "../errorHandler";
import prisma from "../prisma";
import {
    CreateBeneficiaireSchema,
    UpdateBeneficiaireSchema,

} from "../schemas/beneficiaire.schema";
import { z } from "zod";

type CreateBeneficiaireInput = z.infer<typeof CreateBeneficiaireSchema>;
type UpdateBeneficiaireInput = z.infer<typeof UpdateBeneficiaireSchema>;

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
