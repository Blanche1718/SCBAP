// scbap-backend/src/integrations/biometrie/client.ts
import {
  BIOMETRIE_AUTH_TOKEN,
  BIOMETRIE_API_KEY,
  BIOMETRIE_API_BASE_URL,
  BIOMETRIE_DEBUG,
  BIOMETRIE_DEFAULT_APPLICATION,
  BIOMETRIE_DEFAULT_DEEP_LINK_APP,
  BIOMETRIE_DEFAULT_MANY,
  BIOMETRIE_TIMEOUT_MS,
} from "./config";

const RETRIABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type BiometrieApiResponse = {
  success: boolean;
  message?: string;
  data?: string;
  data2?: string;
  isValid?: boolean;
  [key: string]: unknown;
};

type CallGetInput = {
  action: "get-fingerprint" | "compare-fingerprint";
  deepLinkApp?: string;
  many?: string;
  application?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertBiometrieConfig() {
  if (!BIOMETRIE_API_BASE_URL) {
    throw new Error("BIOMETRIE_API_BASE_URL manquante");
  }

  if (!BIOMETRIE_API_KEY) {
    throw new Error("BIOMETRIE_API_KEY manquante");
  }
}

function appendIfPresent(params: URLSearchParams, key: string, value?: string) {
  const trimmed = value?.trim();
  if (trimmed) {
    params.set(key, trimmed);
  }
}

function maskValue(value?: string | null) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function buildBiometrieHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Api-Key": BIOMETRIE_API_KEY,
  };

  if (BIOMETRIE_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${BIOMETRIE_AUTH_TOKEN}`;
  }

  return headers;
}

function logBiometrieDebug(message: string, payload?: Record<string, unknown>) {
  if (!BIOMETRIE_DEBUG) {
    return;
  }

  if (payload) {
    console.debug(`[biometrie] ${message}`, payload);
    return;
  }

  console.debug(`[biometrie] ${message}`);
}

async function biometrieRequest<T>(path: string, attempt = 0): Promise<T> {
  assertBiometrieConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BIOMETRIE_TIMEOUT_MS);
  const requestUrl = `${BIOMETRIE_API_BASE_URL}${path}`;

  try {
    logBiometrieDebug("request", {
      url: requestUrl,
      headers: {
        "X-Api-Key": maskValue(BIOMETRIE_API_KEY),
        Authorization: BIOMETRIE_AUTH_TOKEN ? `Bearer ${maskValue(BIOMETRIE_AUTH_TOKEN)}` : "",
      },
    });

    const response = await fetch(requestUrl, {
      method: path.includes("call-get") ? "POST" : "GET",
      headers: buildBiometrieHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (RETRIABLE_STATUSES.has(response.status) && attempt < 2) {
        await sleep(750 * (attempt + 1));
        return biometrieRequest<T>(path, attempt + 1);
      }

      const details = await response.text().catch(() => "");
      logBiometrieDebug("response-error", {
        status: response.status,
        body: details,
      });
      throw new Error(
        `Erreur biometrie: ${response.status}${details ? ` - ${details}` : ""}`,
      );
    }

    const body = (await response.json()) as T;
    logBiometrieDebug("response-ok", body as Record<string, unknown>);
    return body;
  } catch (error) {
    if (attempt < 2 && error instanceof Error && error.name === "AbortError") {
      await sleep(750 * (attempt + 1));
      return biometrieRequest<T>(path, attempt + 1);
    }

    if (
      attempt < 2 &&
      error instanceof Error &&
      /fetch failed|ECONNRESET|ETIMEDOUT/i.test(error.message)
    ) {
      await sleep(750 * (attempt + 1));
      return biometrieRequest<T>(path, attempt + 1);
    }

    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & { cause?: unknown }).cause
        : undefined;

    logBiometrieDebug("request-failed", {
      url: requestUrl,
      attempt,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      cause:
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
            }
          : cause,
    });

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGetBiometrie(input: CallGetInput) {
  const params = new URLSearchParams();

  appendIfPresent(params, "action", input.action);
  appendIfPresent(params, "token", BIOMETRIE_AUTH_TOKEN);
  appendIfPresent(
    params,
    "deepLinkApp",
    input.deepLinkApp || BIOMETRIE_DEFAULT_DEEP_LINK_APP,
  );
  appendIfPresent(params, "many", input.many || BIOMETRIE_DEFAULT_MANY);
  appendIfPresent(
    params,
    "application",
    input.application || BIOMETRIE_DEFAULT_APPLICATION,
  );

  return biometrieRequest<BiometrieApiResponse>(
    `/api/fingerprints/call-get?${params.toString()}`,
  );
}

export async function getFingerprintStatus(code: string) {
  const cleanedCode = code.trim();
  if (!cleanedCode) {
    throw new Error("Code biometrie manquant");
  }

  return biometrieRequest<BiometrieApiResponse>(
    `/api/fingerprints/get-status-fingerprint/${encodeURIComponent(cleanedCode)}`,
  );
}
