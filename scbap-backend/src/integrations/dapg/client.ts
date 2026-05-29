import { DAPG_API_KEY, DAPG_BASE_URL } from "./config";
import type { DapgLiberationConditionnelle, DapgObligationSpecifique } from "./types";

const DAPG_TIMEOUT_MS = 30_000;
const RETRIABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (attempt < 2 && error instanceof Error && error.name === "AbortError") {
      await sleep(750 * (attempt + 1));
      return dapgRequest<T>(path, attempt + 1);
    }

    if (attempt < 2 && error instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT/i.test(error.message)) {
      await sleep(750 * (attempt + 1));
      return dapgRequest<T>(path, attempt + 1);
    }

    throw error;
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
