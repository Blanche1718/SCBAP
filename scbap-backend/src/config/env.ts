import { logger } from "../logger";

const MIN_SECRET_LENGTH = 32;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function fail(message: string): never {
  logger.error("Invalid environment configuration", { error: message });
  process.exit(1);
}

function requireEnv(name: string) {
  if (!env(name)) {
    fail(`${name} environment variable is required`);
  }
}

function requireSecret(name: string) {
  const value = env(name);
  if (!value) {
    fail(`${name} environment variable is required`);
  }

  if (value.length < MIN_SECRET_LENGTH || value.startsWith("change-me")) {
    fail(`${name} must be a strong secret with at least ${MIN_SECRET_LENGTH} characters`);
  }
}

function validateNumber(name: string, min: number) {
  const value = Number(env(name));
  if (!Number.isFinite(value) || value < min) {
    fail(`${name} must be a number greater than or equal to ${min}`);
  }
}

export function getAllowedOrigins() {
  const rawOrigins =
    env("ALLOWED_ORIGINS") ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function validateEnv() {
  requireEnv("NODE_ENV");
  requireEnv("DATABASE_URL");
  requireSecret("JWT_SECRET");
  requireSecret("PORTAIL_JWT_SECRET");
  validateNumber("BCRYPT_ROUNDS", 8);

  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = getAllowedOrigins();

  if (isProduction) {
    if (allowedOrigins.length === 0) {
      fail("ALLOWED_ORIGINS is required in production");
    }

    if (env("AUTH_COOKIE_SECURE") !== "true") {
      fail("AUTH_COOKIE_SECURE must be true in production");
    }

    if (env("HTTPS") !== "true") {
      fail("HTTPS must be true in production");
    }

    if (!env("REDIS_URL") && !env("REDIS_HOST")) {
      fail("REDIS_URL or REDIS_HOST is required in production for rate limiting");
    }

    if (
      env("MINIO_ACCESS_KEY") === "minioadmin" ||
      env("MINIO_SECRET_KEY") === "minioadmin" ||
      env("MINIO_ROOT_USER") === "minioadmin" ||
      env("MINIO_ROOT_PASSWORD") === "minioadmin"
    ) {
      fail("MinIO default credentials are forbidden in production");
    }

    requireSecret("WEBHOOK_SECRET");
  }

  logger.debug("Environment validated", {
    nodeEnv: process.env.NODE_ENV,
    allowedOrigins: allowedOrigins.length,
  });
}
