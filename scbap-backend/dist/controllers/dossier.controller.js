"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDossiersController = getDossiersController;
exports.exportDossiersController = exportDossiersController;
exports.getDossierByIdController = getDossierByIdController;
exports.createDossierController = createDossierController;
exports.updateDossierController = updateDossierController;
exports.softDeleteDossierController = softDeleteDossierController;
const errorHandler_1 = require("../errorHandler");
const dossier_service_1 = require("../services/dossier.service");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function parseDossierId(idParam) {
    if (typeof idParam !== "string" || !UUID_REGEX.test(idParam)) {
        throw new errorHandler_1.HttpError(400, "Identifiant de dossier invalide");
    }
    return idParam;
}
function parsePaginationParam(value, paramName, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value !== "string") {
        throw new errorHandler_1.HttpError(400, `Le parametre "${paramName}" est invalide`);
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new errorHandler_1.HttpError(400, `Le parametre "${paramName}" doit etre un entier positif`);
    }
    return parsedValue;
}
async function getDossiersController(req, res, next) {
    try {
        const page = parsePaginationParam(req.query.page, "page", 1);
        const limit = parsePaginationParam(req.query.limit, "limit", 10);
        const dossiers = await (0, dossier_service_1.getDossiers)(page, limit, req.user);
        res.status(200).json({
            message: "Liste des dossiers recuperee avec succes",
            data: dossiers,
        });
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de la recuperation des dossiers:", error);
    }
}
async function exportDossiersController(_req, res, next) {
    try {
        const workbook = await (0, dossier_service_1.buildDossiersExportWorkbook)(_req.user);
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `scbap-dossiers-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(Buffer.from(buffer));
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de l'export des dossiers:", error);
    }
}
async function getDossierByIdController(req, res, next) {
    try {
        const id = parseDossierId(req.params.id);
        const dossier = await (0, dossier_service_1.getDossierById)(id, req.user);
        res.status(200).json({
            message: "Dossier recupere avec succes",
            data: dossier,
        });
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de la recuperation du dossier:", error);
    }
}
async function createDossierController(req, res, next) {
    try {
        const dossier = await (0, dossier_service_1.createDossier)(req.body, req.user);
        res.status(201).json({
            message: "Dossier cree avec succes",
            data: dossier,
        });
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de la creation du dossier:", error);
    }
}
async function updateDossierController(req, res, next) {
    try {
        const id = parseDossierId(req.params.id);
        const dossier = await (0, dossier_service_1.updateDossier)(id, req.body, req.user);
        res.status(200).json({
            message: "Dossier mis a jour avec succes",
            data: dossier,
        });
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de la mise a jour du dossier:", error);
    }
}
async function softDeleteDossierController(req, res, next) {
    try {
        const id = parseDossierId(req.params.id);
        const dossier = await (0, dossier_service_1.softDeleteDossier)(id, req.user);
        res.status(200).json({
            message: "Dossier supprime logiquement avec succes",
            data: dossier,
        });
    }
    catch (error) {
        next(error);
        console.error("Erreur lors de la suppression logique du dossier:", error);
    }
}
