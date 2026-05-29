import { z } from "zod";

export const ServiceExterneTypeSchema = z.enum([
  "MEDICAL",
  "EMPLOI",
  "FORMATION",
  "SOCIAL",
  "AUTRE",
]);

export const CreateServiceExterneSchema = z.object({
  nom: z.string().min(1),
  type: ServiceExterneTypeSchema,
  email: z.string().email(),
  telephone: z.string().min(1).nullable().optional(),
});

export const UpdateServiceExterneSchema = CreateServiceExterneSchema.extend({
  actif: z.boolean().optional(),
});

export const CreateAffectationServiceExterneSchema = z.object({
  serviceId: z.string().uuid().nullable().optional(),
  beneficiaireId: z.string().uuid(),
  obligationId: z.string().uuid().nullable().optional(),
  typeSuivi: z.string().min(1),
  libelleSuivi: z.string().min(1),
  frequenceAttendue: z.string().min(1).nullable().optional(),
  lieuAttendu: z.string().min(1).nullable().optional(),
  horairesAttendus: z.unknown().nullable().optional(),
  modalitesConnues: z.boolean().optional(),
});

export type CreateServiceExterneInput = z.infer<
  typeof CreateServiceExterneSchema
>;
export type UpdateServiceExterneInput = z.infer<
  typeof UpdateServiceExterneSchema
>;
export type CreateAffectationServiceExterneInput = z.infer<
  typeof CreateAffectationServiceExterneSchema
>;
