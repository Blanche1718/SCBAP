import { HttpError } from "../errorHandler";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { createNotification } from "./notification.service";
import {
    CreateBeneficiaireSchema,
    UpdateBeneficiaireSchema,

} from "../schemas/beneficiaire.schema";
import { z } from "zod";
import { getUserJuridictionCode } from "../utils/juridiction";

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

const BENEFICIARY_PROFILE_STATUSES = new Set(["A_CONFIGURER", "ACTIF", "REVOQUE"]);
type AccessContext = Pick<AuthenticatedUser, "role" | "structure"> | undefined;

function isBeneficiaireProfileStatut(value?: string) {
    return typeof value === "string" && BENEFICIARY_PROFILE_STATUSES.has(value);
}

function isAdminAccess(user?: AccessContext) {
    return user?.role?.nom === "ADMIN";
}

function buildBeneficiaireAccessFilter(user?: AccessContext): Prisma.BeneficiaireWhereInput {
    if (isAdminAccess(user)) {
        return {
            dossier: {
                is: {
                    deletedAt: null,
                },
            },
        };
    }

    const code = getUserJuridictionCode(user?.structure?.juridiction) ?? "__NO_ACCESS__";

    return {
        dossier: {
            is: {
                deletedAt: null,
                juridictionId: code,
            },
        },
    };
}

function deriveProfilStatut(input?: {
  statut?: string;
  profilStatut?: string;
  profilConfirme?: boolean;
}): string {
    if (isBeneficiaireProfileStatut(input?.profilStatut)) {
        return input?.profilStatut as string;
    }

    if (isBeneficiaireProfileStatut(input?.statut)) {
        return input?.statut as string;
    }

    return input?.profilConfirme ? "ACTIF" : "A_CONFIGURER";
}

async function recordProfilStatutHistorique(
    beneficiaireId: string,
    ancienStatut: string,
    nouveauStatut: string,
) {
    if (ancienStatut === nouveauStatut) {
        return;
    }

    await prisma.historiqueStatut.create({
        data: {
            beneficiaireId,
            ancienStatut,
            nouveauStatut,
        },
    });
}

// SERVICE DE RECUPERATION DES BENEFICIAIRES
export async function getBeneficiaires(page = 1, limit = 10, user?: AccessContext) {
    if (page <= 0 || limit <= 0) {
        throw new HttpError(400, "Parametres de pagination invalides");
    }

    const skip = (page - 1) * limit;
    const accessFilter = buildBeneficiaireAccessFilter(user);
    const [beneficiaires, total] = await prisma.$transaction([
        prisma.beneficiaire.findMany({
            include: {
                dossier: {
                    include: {
                        juridiction: true,
                    },
                },
                obligations: true,
                pointages: {
                    where: {
                        statut: {
                            not: "ABSENT",
                        },
                    },
                    orderBy: { dateHeure: "desc" },
                    take: 1,
                },
                
            },
            where: accessFilter,
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        }),
        prisma.beneficiaire.count({
            where: accessFilter,
        }),
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
export async function getBeneficiaireById(id: string, user?: AccessContext) {
    const accessFilter = buildBeneficiaireAccessFilter(user);
    return prisma.beneficiaire.findFirstOrThrow({
        where: {
            id,
            ...accessFilter,
        },
        include: {
            dossier: {
                include: {
                    juridiction: true,
                },
            },
            zones: {
                orderBy: [
                    { type: "asc" },
                    { nom: "asc" },
                ],
            },
            documents: {
                where: {
                    statut: "UPLOADED",
                },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
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
  const profilStatut = deriveProfilStatut(data);
  const profilConfirme = profilStatut === "ACTIF";

    const dossier = await prisma.dossier.findFirstOrThrow({
        where: { id: data.dossierId, deletedAt: null },
        include: { 
            beneficiaire: true


         },
    });

    if (dossier.beneficiaire) {
        throw new HttpError(409, "Ce dossier a deja un beneficiaire");
    }

    const beneficiaire = await prisma.beneficiaire.create({
        data: {
            dossierId: data.dossierId,
            statut: profilStatut,
            qrCode: data.qrCode,
            profilStatut,
            profilConfirme,
            profilConfirmeLe: profilConfirme ? new Date() : null,
            ...(data.badgeNfc !== undefined
                ? {
                    badgeNfc: data.badgeNfc,
                    badgeNfcAssocieLe: data.badgeNfc ? new Date() : null,
                  }
                : {}),
        },
    });

    await createNotification({
        beneficiaireId: beneficiaire.id,
        type: "NOUVEAU_BENEFICIAIRE",
        priorite: "INFO",
        targetType: "BENEFICIAIRE",
        targetId: beneficiaire.id,
        message: `Nouveau bénéficiaire créé: ${dossier.prenom} ${dossier.nom}`.trim(),
        dateEnvoi: dossier.createdAt,
        metadata: {
            dossierId: dossier.id,
            numeroDossier: dossier.numeroDossier,
            eventAt: dossier.createdAt.toISOString(),
        },
    });

    return beneficiaire;
}

export async function confirmBeneficiaireProfil(id: string, user?: AccessContext) {
    const beneficiaire = await prisma.beneficiaire.findFirstOrThrow({
        where: {
            id,
            ...buildBeneficiaireAccessFilter(user),
        },
        select: { profilStatut: true, profilConfirme: true }
    });

    const updated = await prisma.beneficiaire.update({
        where: { id },
        data: {
            statut: "ACTIF",
            profilStatut: "ACTIF",
            profilConfirme: true,
            profilConfirmeLe: new Date(),
        },
        include: {
            dossier: true,
            zones: true,
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

    await recordProfilStatutHistorique(
        id,
        beneficiaire.profilStatut ?? (beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER"),
        "ACTIF",
    );

    return updated;
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
    user?: AccessContext,
) {
    const beneficiaire = await prisma.beneficiaire.findFirstOrThrow({
        where: {
            id: beneficiaireId,
            ...buildBeneficiaireAccessFilter(user),
        },
        include: {
            dossier: true,
        },
    });

    if ((beneficiaire.profilStatut ?? (beneficiaire.profilConfirme ? "ACTIF" : "A_CONFIGURER")) !== "A_CONFIGURER") {
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
                    heure: obligation.heure
                        ? (() => {
                            const normalizedTime = obligation.heure.length === 5 ? `${obligation.heure}:00` : obligation.heure;
                            const match = normalizedTime.match(/^(\d{2}):(\d{2}):(\d{2})$/);
                            if (!match) {
                                return undefined;
                            }

                            return new Date(
                                Date.UTC(
                                    1970,
                                    0,
                                    1,
                                    Number(match[1]),
                                    Number(match[2]),
                                    Number(match[3]),
                                ),
                            );
                        })()
                        : undefined,
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
    const current = await prisma.beneficiaire.findUniqueOrThrow({
        where: { id },
    });

    const nextProfilStatut = confirmed ? "ACTIF" : "A_CONFIGURER";

    const updated = await prisma.beneficiaire.update({
        where: { id },
        data: {
            statut: nextProfilStatut,
            profilStatut: nextProfilStatut,
            profilConfirme: confirmed,
            profilConfirmeLe: confirmed ? new Date() : null,
        },
    });

    await recordProfilStatutHistorique(
        id,
        current.profilStatut ?? (current.profilConfirme ? "ACTIF" : "A_CONFIGURER"),
        nextProfilStatut,
    );

    return updated;
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

    const nextProfilStatut = deriveProfilStatut(data);
    const profilStatutProvided =
        data.profilStatut !== undefined ||
        data.profilConfirme !== undefined ||
        isBeneficiaireProfileStatut(data.statut);

    return prisma.beneficiaire.update({
        where: { id },
        data: {
            ...data,
            ...(data.badgeNfc !== undefined
              ? {
                  badgeNfc: data.badgeNfc,
                  badgeNfcAssocieLe: data.badgeNfc ? new Date() : null,
                }
              : {}),
            ...(profilStatutProvided
                ? {
                    profilStatut: nextProfilStatut,
                    statut: nextProfilStatut,
                    profilConfirme: nextProfilStatut === "ACTIF",
                    profilConfirmeLe: nextProfilStatut === "ACTIF" ? new Date() : null,
                  }
                : {}),
        },
    });
}
