"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDossier = createDossier;
exports.getDossiers = getDossiers;
exports.getDossierById = getDossierById;
exports.updateDossier = updateDossier;
exports.softDeleteDossier = softDeleteDossier;
// IMPORTS
const node_crypto_1 = require("node:crypto");
const errorHandler_1 = require("../errorHandler");
const prisma_1 = __importDefault(require("../prisma"));
const dossier_schema_1 = require("../schemas/dossier.schema");
// GENERATION QR CODE
function generateQrCode(numeroDossier) {
    return `BEN-${numeroDossier}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
}
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
// SERVICE DE CREATION DE DOSSIER ET BENEFICIAIRE
async function createDossier(input) {
    // VALIDATION DES DONNÉES
    const data = dossier_schema_1.DossierSchema.parse(input);
    // TRANSACTION
    return prisma_1.default.$transaction(async (tx) => {
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
async function getDossiers(page = 1, limit = 10) {
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