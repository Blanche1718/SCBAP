import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AlerteSurveillance } from "../types";

type AlertSummary = {
  ouvertes: number;
  critiques: number;
  traiteesAujourdHui: number;
  beneficiairesTouches: number;
};

type AlertesMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: AlertSummary;
};

type AlertesResponse = {
  data: AlerteSurveillance[];
  meta: AlertesMeta;
};

type AlertesApiResponse = {
  message: string;
  data: AlertesResponse;
};

type AlertFilters = {
  search?: string;
  type?: string;
  niveau?: string;
  statut?: string;
  juridiction?: string;
};

export function useAlertesSurveillance(page = 1, limit = 10, filters: AlertFilters = {}) {
  const [alertes, setAlertes] = useState<AlerteSurveillance[]>([]);
  const [meta, setMeta] = useState<AlertesMeta>({
    total: 0,
    page,
    limit,
    totalPages: 0,
    summary: {
      ouvertes: 0,
      critiques: 0,
      traiteesAujourdHui: 0,
      beneficiairesTouches: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.type) params.set("type", filters.type);
      if (filters.niveau) params.set("niveau", filters.niveau);
      if (filters.statut) params.set("statut", filters.statut);
      if (filters.juridiction) params.set("juridiction", filters.juridiction);

      const res = await api.get<AlertesApiResponse>(`/alertes?${params.toString()}`);
      setAlertes(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.juridiction, filters.niveau, filters.search, filters.statut, filters.type, limit, page]);

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  return { alertes, meta, loading, error, refetch: fetchAlertes, setAlertes, setMeta };
}
