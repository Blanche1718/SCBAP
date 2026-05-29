import { z } from "zod";

export const CreatePrefilledRapportSchema = z.object({
  beneficiaireId: z.string().uuid(),
  type: z.enum(["MENSUEL", "URGENCE", "VISITE", "EVALUATION", "GENERAL"]).default("MENSUEL"),
  periodeDu: z.string().date().optional(),
  periodeAu: z.string().date().optional(),
});

export const UpdateDraftRapportSchema = z.object({
  obligations: z.array(
    z.object({
      obligationId: z.string().uuid(),
      statut: z.enum(["RESPECTEE", "NON_RESPECTEE"]),
      commentaire: z.string().optional().default(""),
    }),
  ).optional(),
  commentaireGeneral: z.string().optional().default(""),
});
