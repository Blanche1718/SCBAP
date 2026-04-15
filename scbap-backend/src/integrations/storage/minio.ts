import { randomUUID } from "node:crypto";
import { Client } from "minio";
import {
  MINIO_ACCESS_KEY,
  MINIO_BUCKET,
  MINIO_ENDPOINT,
  MINIO_REGION,
  MINIO_SECRET_KEY,
} from "./minio.config";

const minioClient = new Client({
  endPoint: MINIO_ENDPOINT.hostname,
  port: MINIO_ENDPOINT.port ? Number(MINIO_ENDPOINT.port) : MINIO_ENDPOINT.protocol === "https:" ? 443 : 80,
  useSSL: MINIO_ENDPOINT.protocol === "https:",
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
  region: MINIO_REGION,
});

let bucketReady: Promise<void> | null = null;

export { MINIO_BUCKET };

export async function ensureMinioBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const exists = await minioClient.bucketExists(MINIO_BUCKET).catch((error) => {
        throw new Error(`Impossible de verifier le bucket MinIO "${MINIO_BUCKET}": ${(error as Error).message}`);
      });

      if (!exists) {
        await minioClient.makeBucket(MINIO_BUCKET, MINIO_REGION).catch((error) => {
          throw new Error(`Impossible de creer le bucket MinIO "${MINIO_BUCKET}": ${(error as Error).message}`);
        });
      }
    })();
  }

  return bucketReady;
}

export function createObjectKey(beneficiaireId: string, documentId: string, fileName?: string | null) {
  const safeFileName = (fileName || "document")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return `beneficiaires/${beneficiaireId}/${documentId}-${randomUUID().slice(0, 8)}-${safeFileName}`;
}

export async function uploadObjectToMinio(args: {
  objectKey: string;
  body: Buffer;
  contentType?: string | null;
}) {
  await ensureMinioBucket();

  await minioClient.putObject(
    MINIO_BUCKET,
    args.objectKey,
    args.body,
    args.body.length,
    {
      "Content-Type": args.contentType || "application/octet-stream",
    },
  ).catch((error) => {
    throw new Error(`Impossible de televerser le fichier vers MinIO: ${(error as Error).message}`);
  });
}

export async function getObjectDownloadUrl(objectKey: string) {
  await ensureMinioBucket();

  return minioClient.presignedGetObject(MINIO_BUCKET, objectKey, 60 * 15);
}
