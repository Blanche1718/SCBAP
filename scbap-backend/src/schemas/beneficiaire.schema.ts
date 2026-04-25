import {z} from "zod";

const ProfilStatutSchema = z.enum(["A_CONFIGURER", "ACTIF", "REVOQUE"]);

export const BeneficiaireSchema = z.object({
  dossierId: z.string().uuid(),
  statut: z.string(),
  profilStatut: ProfilStatutSchema.optional(),
  qrCode: z.string(),
  profilConfirme: z.boolean().optional(),
  badgeNfc: z.string().trim().min(1).nullable().optional(),
});

export const UpdateBeneficiaireSchema = BeneficiaireSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Aucune donnee de beneficiaire a mettre a jour",
  },
);

export const CreateBeneficiaireSchema = BeneficiaireSchema;
