"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateObligationSchema = exports.UpdateObligationSchema = exports.CreateObligationSchema = void 0;
const zod_1 = require("zod");
const structurationStatuses = ["NON_STRUCTUREE", "A_VERIFIER", "VALIDE"];
const BaseObligationSchema = zod_1.z.object({
    categorie_id: zod_1.z.number().int().positive(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    frequence: zod_1.z.string().optional(),
    jour_semaine: zod_1.z.string().optional(),
    heure: zod_1.z.string().optional(),
    lieu: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    statut_structuration: zod_1.z.enum(structurationStatuses).optional(),
    date_debut: zod_1.z.string().optional(),
    date_fin: zod_1.z.string().optional(),
    statut: zod_1.z.string().optional(),
});
exports.CreateObligationSchema = BaseObligationSchema;
exports.UpdateObligationSchema = BaseObligationSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee d'obligation a mettre a jour",
});
exports.ValidateObligationSchema = BaseObligationSchema.partial();
//# sourceMappingURL=obligation.schema.js.map