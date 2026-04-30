"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObligationsByDossier = getObligationsByDossier;
exports.getObligationById = getObligationById;
exports.createObligation = createObligation;
exports.updateObligation = updateObligation;
exports.validateObligation = validateObligation;
const errorHandler_1 = require("../errorHandler");
const prisma_1 = __importDefault(require("../prisma"));
const obligation_schema_1 = require("../schemas/obligation.schema");
// Fonctions pour parser la date
function parseDate(date) {
    if (!date)
        return null;
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
        throw new errorHandler_1.HttpError(400, "Date d'obligation invalide");
    }
    return parsed;
}
// Foynction pour parser l'heure au format HH:mm ou HH:mm:ss
function parseTime(time) {
    if (!time)
        return null;
    const match = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
        throw new errorHandler_1.HttpError(400, "Heure d'obligation invalide");
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] ?? "0");
    const parsed = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
    if (isNaN(parsed.getTime())) {
        throw new errorHandler_1.HttpError(400, "Heure d'obligation invalide");
    }
    return parsed;
}
// Fonction pour supprimer les propriétés undefined d'un objet
function removeUndefinedValues(data) {
    return Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));
}
// fonction pour s'assurer que la catégorie d'obligation existe
async function ensureCategorieExists(categorieId) {
    const categorie = await prisma_1.default.categorieObligation.findUnique({
        where: { id: categorieId },
    });
    if (!categorie) {
        throw new errorHandler_1.HttpError(404, "Categorie d'obligation introuvable");
    }
}
// fonction pour récupérer un dossier avec son bénéficiaire ou lancer une erreur si le dossier n'existe pas ou n'a pas de bénéficiaire
async function getDossierWithBeneficiaireOrThrow(dossierId) {
    const dossier = await prisma_1.default.dossier.findFirstOrThrow({
        where: {
            id: dossierId,
            deletedAt: null,
        },
        include: {
            beneficiaire: true,
        },
    });
    if (!dossier.beneficiaire) {
        throw new errorHandler_1.HttpError(400, "Ce dossier ne possede pas de beneficiaire");
    }
    return dossier;
}
async function ensureObligationEditable(id) {
    const obligation = await prisma_1.default.obligation.findUniqueOrThrow({
        where: { id },
        include: {
            beneficiaire: true,
        },
    });
    if (obligation.beneficiaire.profilConfirme) {
        throw new errorHandler_1.HttpError(409, "Le profil du beneficiaire est deja confirme");
    }
    return obligation;
}
// Fonctions pour construire les données de création et de mise à jour d'une obligation en filtrant les propriétés undefined
function buildObligationCreateData(data, options) {
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
function buildObligationUpdateData(data) {
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
    return removeUndefinedValues(rawData);
}
// Fonction pour récupérer les obligations d'un dossier
async function getObligationsByDossier(dossierId) {
    await getDossierWithBeneficiaireOrThrow(dossierId);
    return prisma_1.default.obligation.findMany({
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
async function getObligationById(id) {
    return prisma_1.default.obligation.findUniqueOrThrow({
        where: { id },
        include: {
            beneficiaire: true,
            categorie: true,
            dossier: true,
        },
    });
}
// Fonction pour créer une obligation
async function createObligation(dossierId, input) {
    const data = obligation_schema_1.CreateObligationSchema.parse(input);
    const dossier = await getDossierWithBeneficiaireOrThrow(dossierId);
    await ensureCategorieExists(data.categorie_id);
    return prisma_1.default.obligation.create({
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
async function updateObligation(id, input) {
    const data = obligation_schema_1.UpdateObligationSchema.parse(input);
    await ensureObligationEditable(id);
    if (data.categorie_id !== undefined) {
        await ensureCategorieExists(data.categorie_id);
    }
    const updateData = buildObligationUpdateData(data);
    const shouldValidate = data.statut_structuration === undefined &&
        (data.raison_modification !== undefined || data.raison_autre !== undefined);
    return prisma_1.default.obligation.update({
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
async function validateObligation(id, input) {
    const data = obligation_schema_1.ValidateObligationSchema.parse(input);
    await ensureObligationEditable(id);
    if (data.categorie_id !== undefined) {
        await ensureCategorieExists(data.categorie_id);
    }
    return prisma_1.default.obligation.update({
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
//# sourceMappingURL=obligation.service.js.map