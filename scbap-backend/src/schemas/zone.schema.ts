import { z } from "zod";

const CoordinateSchema = z.tuple([z.number(), z.number()]);
const PolygonRingSchema = z.array(CoordinateSchema).min(3);

export const ZoneGeometrySchema = z.array(PolygonRingSchema).min(1);

export const CreateZoneSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de la zone est requis"),
  type: z.enum(["AUTORISEE", "INTERDITE"]),
  geometrie: ZoneGeometrySchema.optional(),
  polygons: ZoneGeometrySchema.optional(),
  rayon: z.number().int().positive().optional().nullable(),
});

export const UpdateZoneSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  type: z.enum(["AUTORISEE", "INTERDITE"]).optional(),
  geometrie: ZoneGeometrySchema.optional(),
  polygons: ZoneGeometrySchema.optional(),
  rayon: z.number().int().positive().optional().nullable(),
});

export type CreateZoneInput = z.infer<typeof CreateZoneSchema>;
export type UpdateZoneInput = z.infer<typeof UpdateZoneSchema>;
