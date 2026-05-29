import { z } from "zod";

export const BiometriePointageWebhookSchema = z.object({
  nfc: z.string().trim().min(1),
  timestamp: z.string().trim().datetime(),
  centreNom: z.string().trim().min(1).optional(),
  deviceId: z.string().trim().min(1).optional(),
  success: z.boolean(),
});

export type BiometriePointageWebhookInput = z.infer<
  typeof BiometriePointageWebhookSchema
>;
