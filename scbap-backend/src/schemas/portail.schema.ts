import { z } from "zod";

export const RequestPortalAccessCodeSchema = z.object({
  codeSuivi: z.string().min(1, "Le code de suivi est requis"),
  email: z.string().email("Email invalide"),
});

export const PortalLoginSchema = z.object({
  codeSuivi: z.string().min(1, "Le code de suivi est requis"),
  codeService: z.string().min(1, "Le code de service est requis"),
});

// Définition du schéma pour une occurrence de suivi
export const EvaluationOccurrenceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  present: z.boolean(),
  observation: z.string().trim().nullable().optional(),
});

export const CreatePortalEvaluationSchema = z.object({
  periodeMois: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  frequenceSuivi: z.enum(["QUOTIDIEN", "HEBDOMADAIRE", "MENSUEL"]).optional(),
  conformite: z.enum(["SATISFAISANT", "A_SURVEILLER", "PREOCCUPANT"]),
  observations: z.string().trim().nullable().optional(),
  commentaire: z.string().trim().nullable().optional(),
  occurrences: z.array(EvaluationOccurrenceSchema).min(1, "Au moins une occurrence est requise"),
});

export type CreatePortalEvaluationInput = z.infer<typeof CreatePortalEvaluationSchema>;
