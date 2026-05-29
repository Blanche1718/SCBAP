import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type {
  ApiResponse,
  Beneficiaire,
  PaginatedData,
  PaginationMeta,
} from "../types";

const DEFAULT_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export function useBeneficiaires(page = 1, limit = 10, search = "") {
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
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
      const normalizedSearch = search.trim();
      if (normalizedSearch) params.set("search", normalizedSearch);
      const res = await api.get<ApiResponse<PaginatedData<Beneficiaire>>>(
        `/beneficiaires?${params.toString()}`,
      );
      setBeneficiaires(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { beneficiaires, meta, loading, error, refetch: fetch };
}

export function useBeneficiaire(id?: string) {
  const [beneficiaire, setBeneficiaire] = useState<Beneficiaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setError("Identifiant de beneficiaire invalide");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Beneficiaire>>(`/beneficiaires/${id}`);
      setBeneficiaire(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { beneficiaire, loading, error, refetch: fetch };
}
