import { API_BASE_URL } from "./api";
import { clearPortalToken, getPortalToken } from "./portalAuth";

async function portalRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});
  const token = getPortalToken();

  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearPortalToken();
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

async function portalDownload(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers = new Headers();
  const token = getPortalToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearPortalToken();
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const contentDisposition = res.headers.get("Content-Disposition");
  const filenameMatch = contentDisposition?.match(/filename=\"?([^\"]+)\"?/i);

  return {
    blob: await res.blob(),
    filename: filenameMatch?.[1] ?? null,
  };
}

async function portalUpload(path: string, body: BodyInit, contentType?: string): Promise<void> {
  const headers = new Headers();
  const token = getPortalToken();

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearPortalToken();
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}

export const portalApi = {
  get: <T>(path: string) => portalRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    portalRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  delete: <T>(path: string) => portalRequest<T>(path, { method: "DELETE" }),
  download: portalDownload,
  upload: portalUpload,
};
