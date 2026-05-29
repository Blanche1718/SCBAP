"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../prisma"));
const categorie_obligation_service_1 = require("../services/categorie-obligation.service");
async function main() {
    const result = await (0, categorie_obligation_service_1.seedCategoriesObligation)();
    console.log(`Seed categories obligations termine: ${result.createdCount} categorie(s) creee(s).`);
    if (result.createdCategories.length > 0) {
        console.log("Categories creees:", result.createdCategories.map((category) => category.nom).join(", "));
    }
}
main()
    .catch((error) => {
    console.error("Erreur lors du seed des categories d'obligations:", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
