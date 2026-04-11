"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCategorieObligationSchema = exports.CategorieObligationSchema = void 0;
const zod_1 = require("zod");
exports.CategorieObligationSchema = zod_1.z.object({
    nom: zod_1.z.string().trim().min(1, "Le nom de la categorie est requis"),
    description: zod_1.z.string().trim().optional(),
});
exports.UpdateCategorieObligationSchema = exports.CategorieObligationSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee de categorie a mettre a jour",
});
//# sourceMappingURL=categorie-obligation.schema.js.map