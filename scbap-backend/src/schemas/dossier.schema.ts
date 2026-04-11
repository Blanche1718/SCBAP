import { z } from "zod";

export const DossierSchema = z.object({
  numero_dossier: z.string(),
  juridiction_id: z.number().optional(),
  prison_id: z.number().optional(),
  nom: z.string(),
  prenom: z.string(),
  date_naissance: z.string().optional(),
  lieu_naissance: z.string().optional(),
  nationalite: z.string().optional(),
 sexe: z.enum(["M", "F"]).optional(),
  profession: z.string().optional(),
  adresse: z.string().optional(),
  telephone_contact: z.string().optional(),
  infractions: z.string().optional(),
  numero_mandat_depot: z.string(),
  date_mandat_depot: z.string().optional(),
  condamnation: z.string().optional(),
  date_fin_peine: z.string().optional(),
  duree_peine_mois: z.number().optional(),
  observations: z.string().optional(),
  obligations: z.string().optional(), // texte brut venant de la DAPG
  others_data: z.record(z.string(), z.any()).optional(), // pour stocker des données supplémentaires sous forme de clé-valeur
  statut: z.string().optional(),
  
});

export const UpdateDossierSchema = DossierSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Aucune donnee a mettre a jour",
  },
);
