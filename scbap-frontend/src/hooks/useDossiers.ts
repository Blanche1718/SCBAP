import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type {
  ApiResponse,
  Dossier,
  PaginatedData,
  PaginationMeta,
} from "../types";

const DEFAULT_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export function useDossiers(page = 1, limit = 10) {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    ...DEFAULT_PAGINATION_META,
    page,
    limit,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await api.get<ApiResponse<PaginatedData<Dossier>>>(
        `/dossiers?${params.toString()}`,
      );
      setDossiers(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return { dossiers, meta, loading, error, refetch: fetch };
}

export function useDossier(id?: string) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Identifiant de dossier invalide");
      setLoading(false);
      return;
    }

    api.get<ApiResponse<Dossier>>(`/dossiers/${id}`)
      .then((r) => setDossier(r.data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  return { dossier, loading, error };
}
