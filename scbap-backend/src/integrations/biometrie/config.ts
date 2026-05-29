// scbap-backend/src/integrations/biometrie/config.ts
const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
const normalizeBaseUrl = (value: string) => {
  const trimmed = trimTrailingSlash(value);

  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
};

export const BIOMETRIE_API_BASE_URL = trimTrailingSlash(
  normalizeBaseUrl(process.env.BIOMETRIE_API_BASE_URL || ""),
);

export const BIOMETRIE_API_KEY = process.env.BIOMETRIE_API_KEY || "";
export const BIOMETRIE_AUTH_TOKEN =
  process.env.BIOMETRIE_AUTH_TOKEN || BIOMETRIE_API_KEY;

export const BIOMETRIE_DEFAULT_APPLICATION =
  process.env.BIOMETRIE_APPLICATION || "siope";

export const BIOMETRIE_DEFAULT_DEEP_LINK_APP =
  process.env.BIOMETRIE_DEEP_LINK_APP || "";

export const BIOMETRIE_DEFAULT_MANY = process.env.BIOMETRIE_MANY || "yes";

export const BIOMETRIE_TIMEOUT_MS = Number(
  process.env.BIOMETRIE_TIMEOUT_MS || 30_000,
);

export const BIOMETRIE_DEBUG = process.env.BIOMETRIE_DEBUG === "true";
