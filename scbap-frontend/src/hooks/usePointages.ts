import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { ApiResponse, PaginatedData, PaginationMeta, Pointage } from "../types";

const DEFAULT_PAGINATION_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

export function usePointages(
  page = 1,
  limit = 10,
  search = "",
  statut = "",
  date = "",
  lieu = "",
  type = "",
) {
  const [pointages, setPointages] = useState<Pointage[]>([]);
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

      if (search) params.set("search", search);
      if (statut) params.set("statut", statut);
      if (date) params.set("date", date);
      if (lieu) params.set("lieu", lieu);
      if (type) params.set("type", type);

      const res = await api.get<ApiResponse<PaginatedData<Pointage>>>(
        `/pointages?${params.toString()}`,
      );

      setPointages(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statut, date, lieu, type]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { pointages, meta, loading, error, refetch: fetch };
}
