import { z } from "zod";

export const CategorieObligationSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de la categorie est requis"),
  description: z.string().trim().optional(),
});

export const UpdateCategorieObligationSchema =
  CategorieObligationSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Aucune donnee de categorie a mettre a jour",
    },
  );
