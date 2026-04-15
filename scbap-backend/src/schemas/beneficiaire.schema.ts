import {z} from "zod";

export const BeneficiaireSchema = z.object({
  dossierId: z.string().uuid(),
  statut: z.string(),
  qrCode: z.string(),
  profilConfirme: z.boolean().optional(),
});

export const UpdateBeneficiaireSchema = BeneficiaireSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Aucune donnee de beneficiaire a mettre a jour",
  },
);

export const CreateBeneficiaireSchema = BeneficiaireSchema;
