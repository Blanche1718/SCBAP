"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoriesObligationController = getCategoriesObligationController;
exports.getCategorieObligationByIdController = getCategorieObligationByIdController;
exports.createCategorieObligationController = createCategorieObligationController;
exports.updateCategorieObligationController = updateCategorieObligationController;
exports.deleteCategorieObligationController = deleteCategorieObligationController;
const errorHandler_1 = require("../errorHandler");
const categorie_obligation_service_1 = require("../services/categorie-obligation.service");
function parseCategoryId(value) {
    if (typeof value !== "string") {
        throw new errorHandler_1.HttpError(400, "Identifiant de categorie invalide");
    }
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new errorHandler_1.HttpError(400, "Identifiant de categorie invalide");
    }
    return id;
}
async function getCategoriesObligationController(_req, res, next) {
    try {
        const categories = await (0, categorie_obligation_service_1.getCategoriesObligation)();
        res.status(200).json({
            message: "Liste des categories recuperee avec succes",
            data: categories,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getCategorieObligationByIdController(req, res, next) {
    try {
        const id = parseCategoryId(req.params.id);
        const category = await (0, categorie_obligation_service_1.getCategorieObligationById)(id);
        res.status(200).json({
            message: "Categorie recuperee avec succes",
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
}
async function createCategorieObligationController(req, res, next) {
    try {
        const category = await (0, categorie_obligation_service_1.createCategorieObligation)(req.body);
        res.status(201).json({
            message: "Categorie creee avec succes",
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateCategorieObligationController(req, res, next) {
    try {
        const id = parseCategoryId(req.params.id);
        const category = await (0, categorie_obligation_service_1.updateCategorieObligation)(id, req.body);
        res.status(200).json({
            message: "Categorie mise a jour avec succes",
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteCategorieObligationController(req, res, next) {
    try {
        const id = parseCategoryId(req.params.id);
        const category = await (0, categorie_obligation_service_1.deleteCategorieObligation)(id);
        res.status(200).json({
            message: "Categorie supprimee avec succes",
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=categorie-obligation.controller.js.map