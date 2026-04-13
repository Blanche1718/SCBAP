import { z } from "zod";

const structurationStatuses = ["NON_STRUCTUREE", "A_VERIFIER", "VALIDE"] as const;
const raisonsModification = [
  "NON_CONFORME",
  "ORDONNE_PAR_DAPG",
  "AUTRE",
] as const;

const BaseObligationSchema = z.object({
  categorie_id: z.string().uuid(),
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
  raison_modification: z.enum(raisonsModification).optional(),
  raison_autre: z.string().optional(),
  modifie_par: z.string().uuid().optional(),
});

export const CreateObligationSchema = BaseObligationSchema;

export const UpdateObligationSchema = BaseObligationSchema.partial()
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

export const ValidateObligationSchema = BaseObligationSchema.partial();
