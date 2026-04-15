"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDossiers = getDossiers;
exports.getDossierById = getDossierById;
exports.updateDossier = updateDossier;
exports.softDeleteDossier = softDeleteDossier;
const errorHandler_1 = require("../errorHandler");
const prisma_1 = __importDefault(require("../prisma"));
const dossier_schema_1 = require("../schemas/dossier.schema");
// FONCTION DE PARSING DE LA DATE
function parseDate(date) {
    if (!date)
        return null;
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
        throw new errorHandler_1.HttpError(400, "Date invalide");
    }
    return parsed;
}
// SERVICE DE RECUPERATION DES DOSSIERS
async function getDossiers(page = 1, limit = 10) {
    if (page <= 0 || limit <= 0) {
        throw new errorHandler_1.HttpError(400, "Parametres de pagination invalides");
    }
    const skip = (page - 1) * limit;
    const [dossiers, total] = await prisma_1.default.$transaction([
        prisma_1.default.dossier.findMany({
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
        prisma_1.default.dossier.count({
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
async function getDossierById(id) {
    return prisma_1.default.dossier.findFirstOrThrow({
        where: {
            id,
            deletedAt: null,
        },
        include: {
            beneficiaire: true,
        },
    });
}
async function updateDossier(id, input) {
    const data = dossier_schema_1.UpdateDossierSchema.parse(input);
    await prisma_1.default.dossier.findFirstOrThrow({
        where: {
            id,
            deletedAt: null,
        },
    });
    const rawData = {
        numeroDossier: data.numero_dossier,
        juridictionId: data.juridiction_id,
        prisonId: data.prison_id,
        prisonName: data.prison_name,
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
        decisionDapg: data.decision_dapg,
        dateDecisionDapg: data.date_decision_dapg
            ? parseDate(data.date_decision_dapg)
            : undefined,
        dureeTempsEpreuve: data.duree_temps_epreuve,
        observations: data.observations,
        obligations: data.obligations,
        othersData: data.others_data,
        statut: data.statut,
    };
    const cleanData = Object.fromEntries(Object.entries(rawData).filter(([_, value]) => value !== undefined));
    return prisma_1.default.dossier.update({
        where: { id },
        data: cleanData,
        include: {
            beneficiaire: true,
        },
    });
}
async function softDeleteDossier(id) {
    await prisma_1.default.dossier.findFirstOrThrow({
        where: {
            id,
            deletedAt: null,
        },
    });
    return prisma_1.default.dossier.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
        include: {
            beneficiaire: true,
        },
    });
}
//# sourceMappingURL=dossier.service.js.map