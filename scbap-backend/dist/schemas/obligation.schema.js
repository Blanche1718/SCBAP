"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateObligationSchema = exports.UpdateObligationSchema = exports.CreateObligationSchema = void 0;
const zod_1 = require("zod");
const structurationStatuses = ["NON_STRUCTUREE", "A_VERIFIER", "VALIDE"];
const raisonsModification = [
    "NON_CONFORME",
    "ORDONNE_PAR_DAPG",
    "AUTRE",
];
const BaseObligationSchema = zod_1.z.object({
    categorie_id: zod_1.z.string().uuid(),
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
    raison_modification: zod_1.z.enum(raisonsModification).optional(),
    raison_autre: zod_1.z.string().optional(),
    modifie_par: zod_1.z.string().uuid().optional(),
});
exports.CreateObligationSchema = BaseObligationSchema;
exports.UpdateObligationSchema = BaseObligationSchema.partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee d'obligation a mettre a jour",
})
    .superRefine((data, ctx) => {
    if (data.raison_modification === "AUTRE" && !data.raison_autre) {
        ctx.addIssue({
            code: "custom",
            message: "La raison 'AUTRE' exige un texte libre",
            path: ["raison_autre"],
        });
    }
});
exports.ValidateObligationSchema = BaseObligationSchema.partial();
//# sourceMappingURL=obligation.schema.js.map