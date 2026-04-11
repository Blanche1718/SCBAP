"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDossierSchema = exports.DossierSchema = void 0;
const zod_1 = require("zod");
exports.DossierSchema = zod_1.z.object({
    numero_dossier: zod_1.z.string(),
    juridiction_id: zod_1.z.number().optional(),
    prison_id: zod_1.z.number().optional(),
    nom: zod_1.z.string(),
    prenom: zod_1.z.string(),
    date_naissance: zod_1.z.string().optional(),
    lieu_naissance: zod_1.z.string().optional(),
    nationalite: zod_1.z.string().optional(),
    sexe: zod_1.z.enum(["M", "F"]).optional(),
    profession: zod_1.z.string().optional(),
    adresse: zod_1.z.string().optional(),
    telephone_contact: zod_1.z.string().optional(),
    infractions: zod_1.z.string().optional(),
    numero_mandat_depot: zod_1.z.string(),
    date_mandat_depot: zod_1.z.string().optional(),
    condamnation: zod_1.z.string().optional(),
    date_fin_peine: zod_1.z.string().optional(),
    duree_peine_mois: zod_1.z.number().optional(),
    observations: zod_1.z.string().optional(),
    obligations: zod_1.z.string().optional(), // texte brut venant de la DAPG
    others_data: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(), // pour stocker des données supplémentaires sous forme de clé-valeur
    statut: zod_1.z.string().optional(),
});
exports.UpdateDossierSchema = exports.DossierSchema.partial().refine((data) => Object.keys(data).length > 0, {
    message: "Aucune donnee a mettre a jour",
});
//# sourceMappingURL=dossier.schema.js.map