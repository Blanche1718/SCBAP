"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObligationsByDossierController = getObligationsByDossierController;
exports.createObligationController = createObligationController;
exports.getObligationByIdController = getObligationByIdController;
exports.updateObligationController = updateObligationController;
exports.validateObligationController = validateObligationController;
const errorHandler_1 = require("../errorHandler");
const obligation_service_1 = require("../services/obligation.service");
function parseNumericId(value, label) {
    if (typeof value !== "string") {
        throw new errorHandler_1.HttpError(400, `Identifiant de ${label} invalide`);
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new errorHandler_1.HttpError(400, `Identifiant de ${label} invalide`);
    }
    return id;
}
async function getObligationsByDossierController(req, res, next) {
    try {
        const dossierId = parseNumericId(req.params.dossierId, "dossier");
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
        const dossierId = parseNumericId(req.params.dossierId, "dossier");
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
        const id = parseNumericId(req.params.id, "obligation");
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
        const id = parseNumericId(req.params.id, "obligation");
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
        const id = parseNumericId(req.params.id, "obligation");
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
//# sourceMappingURL=obligation.controller.js.map