import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errorHandler";

const SIGNATURE_HEADER = "x-webhook-signature";
const TIMESTAMP_HEADER = "x-webhook-timestamp";
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

function getWebhookSecret() {
  const secret = process.env.WEBHOOK_SECRET?.trim();
  if (!secret || secret.startsWith("change-me") || secret.length < 32) {
    throw new HttpError(500, "WEBHOOK_SECRET est manquant ou trop faible");
  }

  return secret;
}

function normalizeSignature(signature: string) {
  return signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
}

export function verifyWebhookSignature(req: Request, _res: Response, next: NextFunction) {
  try {
    const signature = String(req.headers[SIGNATURE_HEADER] ?? "");
    const timestamp = String(req.headers[TIMESTAMP_HEADER] ?? "");

    if (!signature || !timestamp) {
      throw new HttpError(401, "Signature webhook manquante");
    }

    const timestampValue = Number(timestamp);
    const timestampMs = timestampValue < 10_000_000_000 ? timestampValue * 1000 : timestampValue;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_DRIFT_MS) {
      throw new HttpError(401, "Timestamp webhook invalide");
    }

    const expected = crypto
      .createHmac("sha256", getWebhookSecret())
      .update(`${timestamp}.${JSON.stringify(req.body)}`)
      .digest("hex");
    const provided = normalizeSignature(signature);

    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(provided, "hex");

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new HttpError(401, "Signature webhook invalide");
    }

    next();
  } catch (error) {
    next(error);
  }
}
