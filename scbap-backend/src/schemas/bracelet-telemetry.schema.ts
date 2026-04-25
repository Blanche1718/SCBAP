import { z } from "zod";

export const BraceletTelemetrySchema = z.object({
  device_id: z.string().trim().min(1),
  user_id: z.string().trim().min(1).optional(),
  timestamp: z.string().trim().datetime(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().int().nonnegative().optional(),
    zone_id: z.string().trim().min(1).optional(),
    zone_status: z.enum(["INSIDE", "OUTSIDE", "TRANSITION"]).optional(),
  }),
  health: z.object({
    battery_pct: z.number().int().min(0).max(100).optional(),
    gprs_signal: z.number().int().optional(),
    gps_satellites: z.number().int().nonnegative().optional(),
  }),
  alerts: z.object({
    strap_status: z.number().int().min(0).max(1).optional(),
    geofence_breach: z.boolean().optional(),
    gps_lost: z.boolean().optional(),
    gprs_lost: z.boolean().optional(),
    case_tamper: z.boolean().optional(),
    power_loss: z.boolean().optional(),
  }),
  status: z.string().trim().min(1),
});

export type BraceletTelemetryInput = z.infer<typeof BraceletTelemetrySchema>;
