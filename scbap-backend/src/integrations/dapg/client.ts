import { DAPG_API_KEY, DAPG_BASE_URL } from "./config";
import type { DapgLiberationConditionnelle } from "./types";

async function dapgRequest<T>(path: string): Promise<T> {
  if (!DAPG_API_KEY) {
    throw new Error("DAPG_API_KEY manquante");
  }

  const response = await fetch(`${DAPG_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": DAPG_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur DAPG: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
