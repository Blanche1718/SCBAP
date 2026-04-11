"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CATEGORIES_OBLIGATION = void 0;
exports.getCategoriesObligation = getCategoriesObligation;
exports.getCategorieObligationById = getCategorieObligationById;
exports.createCategorieObligation = createCategorieObligation;
exports.updateCategorieObligation = updateCategorieObligation;
exports.deleteCategorieObligation = deleteCategorieObligation;
exports.seedCategoriesObligation = seedCategoriesObligation;
const errorHandler_1 = require("../errorHandler");
const prisma_1 = __importDefault(require("../prisma"));
const categorie_obligation_schema_1 = require("../schemas/categorie-obligation.schema");
exports.DEFAULT_CATEGORIES_OBLIGATION = [
    {
        nom: "POINTAGE",
        description: "Obligation de se presenter a une structure a une frequence definie.",
    },
];
async function ensureCategoryNameAvailable(nom, excludeId) {
    const existingCategory = await prisma_1.default.categorieObligation.findFirst({
        where: {
            nom: {
                equals: nom,
                mode: "insensitive",
            },
            ...(excludeId !== undefined && {
                NOT: {
                    id: excludeId,
                },
            }),
        },
    });
    if (existingCategory) {
        throw new errorHandler_1.HttpError(409, "Une categorie d'obligation avec ce nom existe deja");
    }
}
async function getCategoriesObligation() {
    return prisma_1.default.categorieObligation.findMany({
        orderBy: {
            nom: "asc",
        },
    });
}
async function getCategorieObligationById(id) {
    return prisma_1.default.categorieObligation.findUniqueOrThrow({
        where: { id },
        include: {
            obligations: true,
        },
    });
}
async function createCategorieObligation(input) {
    const data = categorie_obligation_schema_1.CategorieObligationSchema.parse(input);
    await ensureCategoryNameAvailable(data.nom);
    return prisma_1.default.categorieObligation.create({
        data,
    });
}
async function updateCategorieObligation(id, input) {
    const data = categorie_obligation_schema_1.UpdateCategorieObligationSchema.parse(input);
    await prisma_1.default.categorieObligation.findUniqueOrThrow({
        where: { id },
    });
    if (data.nom !== undefined) {
        await ensureCategoryNameAvailable(data.nom, id);
    }
    return prisma_1.default.categorieObligation.update({
        where: { id },
        data,
    });
}
async function deleteCategorieObligation(id) {
    await prisma_1.default.categorieObligation.findUniqueOrThrow({
        where: { id },
    });
    return prisma_1.default.categorieObligation.delete({
        where: { id },
    });
}
async function seedCategoriesObligation() {
    const existingCategories = await prisma_1.default.categorieObligation.findMany({
        select: {
            nom: true,
        },
    });
    const existingNames = new Set(existingCategories.map((category) => category.nom.toLowerCase()));
    const categoriesToCreate = exports.DEFAULT_CATEGORIES_OBLIGATION.filter((category) => !existingNames.has(category.nom.toLowerCase()));
    if (categoriesToCreate.length === 0) {
        return {
            createdCount: 0,
            createdCategories: [],
        };
    }
    await prisma_1.default.categorieObligation.createMany({
        data: categoriesToCreate,
    });
    return {
        createdCount: categoriesToCreate.length,
        createdCategories: categoriesToCreate,
    };
}
//# sourceMappingURL=categorie-obligation.service.js.map