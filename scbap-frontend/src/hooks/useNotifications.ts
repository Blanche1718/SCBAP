import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Notification } from "../types";

type NotificationSummary = {
  total: number;
  unread: number;
  critiques: number;
  normales: number;
  infos: number;
};

type NotificationsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: NotificationSummary;
};

type NotificationsResponse = {
  data: Notification[];
  meta: NotificationsMeta;
};

type NotificationsApiResponse = {
  message: string;
  data: NotificationsResponse;
};

type NotificationFilters = {
  search?: string;
  type?: string;
  priorite?: string;
  lu?: "TOUS" | "LUS" | "NON_LUS";
  juridiction?: string;
};

function buildParams(page: number, limit: number, filters: NotificationFilters) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.priorite) params.set("priorite", filters.priorite);
  if (filters.lu && filters.lu !== "TOUS") params.set("lu", filters.lu);
  if (filters.juridiction) params.set("juridiction", filters.juridiction);

  return params;
}

export function useNotifications(
  page = 1,
  limit = 10,
  filters: NotificationFilters = {},
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<NotificationsMeta>({
    total: 0,
    page,
    limit,
    totalPages: 0,
    summary: {
      total: 0,
      unread: 0,
      critiques: 0,
      normales: 0,
      infos: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = buildParams(page, limit, filters);
      const response = await api.get<NotificationsApiResponse>(`/notifications?${params.toString()}`);
      setNotifications(response.data.data);
      setMeta(response.data.meta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.juridiction, filters.lu, filters.priorite, filters.search, filters.type, limit, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      await api.patch(`/notifications/${id}/lire`, {});
      await fetchNotifications();
    },
    [fetchNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    const params = buildParams(page, limit, filters);
    await api.patch(`/notifications/lire-tout?${params.toString()}`, {});
    await fetchNotifications();
  }, [fetchNotifications, filters, limit, page]);

  return {
    notifications,
    meta,
    loading,
    error,
    refetch: fetchNotifications,
    setNotifications,
    setMeta,
    markAsRead,
    markAllAsRead,
  };
}
