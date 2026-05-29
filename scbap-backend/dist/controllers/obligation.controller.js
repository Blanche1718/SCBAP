"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObligationsByDossierController = getObligationsByDossierController;
exports.createObligationController = createObligationController;
exports.getObligationByIdController = getObligationByIdController;
exports.updateObligationController = updateObligationController;
exports.validateObligationController = validateObligationController;
exports.listSpecificObligationReferencesController = listSpecificObligationReferencesController;
exports.syncSpecificObligationReferencesController = syncSpecificObligationReferencesController;
exports.updateSpecificObligationReferenceController = updateSpecificObligationReferenceController;
exports.deleteSpecificObligationReferenceController = deleteSpecificObligationReferenceController;
const errorHandler_1 = require("../errorHandler");
const obligation_service_1 = require("../services/obligation.service");
const obligation_specifique_reference_service_1 = require("../services/obligation-specifique-reference.service");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function parseUuid(value, label) {
    if (typeof value !== "string" || !UUID_REGEX.test(value)) {
        throw new errorHandler_1.HttpError(400, `Identifiant de ${label} invalide`);
    }
    return value;
}
async function getObligationsByDossierController(req, res, next) {
    try {
        const dossierId = parseUuid(req.params.dossierId, "dossier");
        const obligations = await (0, obligation_service_1.getObligationsByDossier)(dossierId);
        res.status(200).json({
            message: "Liste des obligations recuperee avec succes",
            data: obligations,
        });
    }
    catch (error) {
        next(error);
    }
}
async function createObligationController(req, res, next) {
    try {
        const dossierId = parseUuid(req.params.dossierId, "dossier");
        const obligation = await (0, obligation_service_1.createObligation)(dossierId, req.body);
        res.status(201).json({
            message: "Obligation creee avec succes",
            data: obligation,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getObligationByIdController(req, res, next) {
    try {
        const id = parseUuid(req.params.id, "obligation");
        const obligation = await (0, obligation_service_1.getObligationById)(id);
        res.status(200).json({
            message: "Obligation recuperee avec succes",
            data: obligation,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateObligationController(req, res, next) {
    try {
        const id = parseUuid(req.params.id, "obligation");
        const obligation = await (0, obligation_service_1.updateObligation)(id, req.body);
        res.status(200).json({
            message: "Obligation mise a jour avec succes",
            data: obligation,
        });
    }
    catch (error) {
        next(error);
    }
}
async function validateObligationController(req, res, next) {
    try {
        const id = parseUuid(req.params.id, "obligation");
        const obligation = await (0, obligation_service_1.validateObligation)(id, req.body);
        res.status(200).json({
            message: "Obligation validee avec succes",
            data: obligation,
        });
    }
    catch (error) {
        next(error);
    }
}
async function listSpecificObligationReferencesController(_req, res, next) {
    try {
        const references = await (0, obligation_specifique_reference_service_1.listSpecificObligationReferences)();
        res.status(200).json({
            message: "Obligations specifiques recuperees avec succes",
            data: references,
        });
    }
    catch (error) {
        next(error);
    }
}
async function syncSpecificObligationReferencesController(_req, res, next) {
    try {
        const result = await (0, obligation_specifique_reference_service_1.syncDapgSpecificObligationReferences)();
        res.status(200).json({
            message: "Obligations specifiques synchronisees avec succes",
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateSpecificObligationReferenceController(req, res, next) {
    try {
        const id = parseUuid(req.params.id, "obligation specifique");
        const reference = await (0, obligation_specifique_reference_service_1.updateSpecificObligationReference)(id, req.body);
        res.status(200).json({
            message: "Obligation specifique mise a jour avec succes",
            data: reference,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteSpecificObligationReferenceController(req, res, next) {
    try {
        const id = parseUuid(req.params.id, "obligation specifique");
        const reference = await (0, obligation_specifique_reference_service_1.deleteSpecificObligationReference)(id);
        res.status(200).json({
            message: "Obligation specifique supprimee avec succes",
            data: reference,
        });
    }
    catch (error) {
        next(error);
    }
}
