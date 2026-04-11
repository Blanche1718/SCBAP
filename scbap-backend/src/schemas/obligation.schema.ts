import { z } from "zod";

const structurationStatuses = ["NON_STRUCTUREE", "A_VERIFIER", "VALIDE"] as const;

const BaseObligationSchema = z.object({
  categorie_id: z.number().int().positive(),
  description: z.string().optional(),
  type: z.string().optional(),
  frequence: z.string().optional(),
  jour_semaine: z.string().optional(),
  heure: z.string().optional(),
  lieu: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  statut_structuration: z.enum(structurationStatuses).optional(),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  statut: z.string().optional(),
});

export const CreateObligationSchema = BaseObligationSchema;

export const UpdateObligationSchema = BaseObligationSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Aucune donnee d'obligation a mettre a jour",
  },
);

export const ValidateObligationSchema = BaseObligationSchema.partial();
