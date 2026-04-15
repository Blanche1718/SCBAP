import "dotenv/config";

const rawEndpoint = process.env.MINIO_ENDPOINT?.trim() || "http://localhost:9000";

export const MINIO_ENDPOINT = new URL(rawEndpoint);
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY?.trim() || "";
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY?.trim() || "";
export const MINIO_BUCKET = process.env.MINIO_BUCKET?.trim() || "scbap-documents";
export const MINIO_REGION = process.env.MINIO_REGION?.trim() || "us-east-1";

export function ensureMinioConfig() {
  if (!MINIO_ACCESS_KEY) {
    throw new Error("MINIO_ACCESS_KEY est manquant dans l'environnement");
  }

  if (!MINIO_SECRET_KEY) {
    throw new Error("MINIO_SECRET_KEY est manquant dans l'environnement");
  }

  if (!MINIO_BUCKET) {
    throw new Error("MINIO_BUCKET est manquant dans l'environnement");
  }
}
