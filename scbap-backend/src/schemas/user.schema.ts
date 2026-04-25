import { z } from "zod";

export const UpdateUserAdminSchema = z
  .object({
    nom: z.string().min(1).optional(),
    prenom: z.string().min(1).optional(),
    email: z.string().email().optional(),
    telephone: z.string().min(1).nullable().optional(),
    statut: z.enum(["ACTIF", "INACTIF", "SUSPENDU"]).optional(),
    roleId: z.string().min(1).optional(),
    structureId: z.string().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Au moins un champ doit etre fourni",
  });

export const UpdateOwnProfileSchema = z
  .object({
    nom: z.string().min(1).optional(),
    prenom: z.string().min(1).optional(),
    telephone: z.string().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Au moins un champ doit etre fourni",
  });

export const UpdateOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "La confirmation du mot de passe ne correspond pas",
  path: ["confirmPassword"],
});

export type UpdateUserAdminInput = z.infer<typeof UpdateUserAdminSchema>;
export type UpdateOwnProfileInput = z.infer<typeof UpdateOwnProfileSchema>;
export type UpdateOwnPasswordInput = z.infer<typeof UpdateOwnPasswordSchema>;
