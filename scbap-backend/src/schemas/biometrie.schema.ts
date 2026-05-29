import { z } from "zod";

export const StartBiometrieEnrolementSchema = z.object({
  beneficiaireId: z.string().uuid(),
  deepLinkApp: z.string().trim().min(1).optional(),
  application: z.string().trim().min(1).optional(),
  many: z.string().trim().min(1).optional(),
});

export const BiometrieStatusSchema = z.object({
  code: z.string().trim().min(1),
});

export type StartBiometrieEnrolementInput = z.infer<
  typeof StartBiometrieEnrolementSchema
>;

export type BiometrieStatusInput = z.infer<typeof BiometrieStatusSchema>;
