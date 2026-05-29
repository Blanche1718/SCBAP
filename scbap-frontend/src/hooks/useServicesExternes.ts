import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type {
  ApiResponse,
  ServiceExterne,
  ServiceExterneDetail,
} from "../types";

export function useServicesExternes() {
  const [services, setServices] = useState<ServiceExterne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ApiResponse<ServiceExterne[]>>("/services-externes");
      setServices(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    services,
    loading,
    error,
    refetch: fetch,
  };
}

export function useServiceExterne(id?: string) {
  const [service, setService] = useState<ServiceExterneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setError("Identifiant de service externe invalide");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ApiResponse<ServiceExterneDetail>>(
        `/services-externes/${id}`,
      );
      setService(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    service,
    loading,
    error,
    refetch: fetch,
  };
}
