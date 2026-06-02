import { DAPG_API_KEY, DAPG_BASE_URL } from "./config";
import type { DapgLiberationConditionnelle, DapgObligationSpecifique } from "./types";

const DAPG_TIMEOUT_MS = 30_000;
const RETRIABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const DAPG_UNREACHABLE_MESSAGE =
  "API DAPG injoignable depuis le serveur. Verifiez l'URL, le reseau Render ou une restriction IP cote DAPG.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCauseCode(error: Error) {
  const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  return cause && typeof cause === "object" && "code" in cause
    ? String((cause as { code?: unknown }).code)
    : "";
}

function isRetriableNetworkError(error: Error) {
  const causeCode = getErrorCauseCode(error);
  return (
    error.name === "AbortError" ||
    /fetch failed|ECONNRESET|ETIMEDOUT|Connect Timeout/i.test(error.message) ||
    /UND_ERR_CONNECT_TIMEOUT|ECONNRESET|ETIMEDOUT/i.test(causeCode)
  );
}

async function dapgRequest<T>(path: string, attempt = 0): Promise<T> {
  if (!DAPG_API_KEY) {
    throw new Error("DAPG_API_KEY manquante");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DAPG_TIMEOUT_MS);

  try {
    const response = await fetch(`${DAPG_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": DAPG_API_KEY,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (RETRIABLE_STATUSES.has(response.status) && attempt < 2) {
        await sleep(750 * (attempt + 1));
        return dapgRequest<T>(path, attempt + 1);
      }

      const details = await response.text().catch(() => "");
      throw new Error(`Erreur DAPG: ${response.status}${details ? ` - ${details}` : ""}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && isRetriableNetworkError(error)) {
      if (attempt < 2) {
        await sleep(750 * (attempt + 1));
        return dapgRequest<T>(path, attempt + 1);
      }

      throw new Error(`${DAPG_UNREACHABLE_MESSAGE} Detail: ${serializeCause(error)}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function serializeCause(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  if (cause instanceof Error) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
}

export async function checkDapgConnection() {
  const path = "/liberations-conditionnelles?page=1&per_page=1";
  const url = `${DAPG_BASE_URL}${path}`;

  if (!DAPG_API_KEY) {
    return {
      ok: false,
      baseUrl: DAPG_BASE_URL,
      apiKeyConfigured: false,
      message: "DAPG_API_KEY manquante",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DAPG_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": DAPG_API_KEY,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null) as Partial<DapgPaginatedResponse<unknown>> | null;

    return {
      ok: response.ok && body?.success === true,
      baseUrl: DAPG_BASE_URL,
      apiKeyConfigured: true,
      status: response.status,
      success: body?.success ?? null,
      total: typeof body?.total === "number" ? body.total : null,
      received: Array.isArray(body?.data) ? body.data.length : null,
      message: response.ok ? "Connexion DAPG OK" : `Erreur DAPG HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl: DAPG_BASE_URL,
      apiKeyConfigured: true,
      message: serializeCause(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export interface DapgPaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  data: T[];
}

export async function listDapgLiberationConditionnelles(
  page = 1,
  perPage = 50,
): Promise<DapgPaginatedResponse<DapgLiberationConditionnelle>> {
  return dapgRequest<DapgPaginatedResponse<DapgLiberationConditionnelle>>(
    `/liberations-conditionnelles?page=${page}&per_page=${perPage}`,
  );
}

export async function getDapgLiberationConditionnelle(
  id: string | number,
): Promise<DapgLiberationConditionnelle> {
  const response = await dapgRequest<{ success: boolean; data: DapgLiberationConditionnelle }>(
    `/liberations-conditionnelles/${id}`,
  );

  return response.data;
}

export async function listDapgObligationsSpecifiques(
  page = 1,
  perPage = 50,
): Promise<DapgPaginatedResponse<DapgObligationSpecifique>> {
  return dapgRequest<DapgPaginatedResponse<DapgObligationSpecifique>>(
    `/obligations/specifiques?page=${page}&per_page=${perPage}`,
  );
}
