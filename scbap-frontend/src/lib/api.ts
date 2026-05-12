export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});

  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("scbap:auth-invalid"));
      }
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

async function download(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers = new Headers();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("scbap:auth-invalid"));
      }
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const contentDisposition = res.headers.get("Content-Disposition");
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);

  return {
    blob: await res.blob(),
    filename: filenameMatch?.[1] ?? null,
  };
}

async function upload(path: string, body: BodyInit, contentType?: string): Promise<void> {
  const headers = new Headers();

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body,
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("scbap:auth-invalid"));
      }
    }

    const err = await res.json().catch(() => ({ message: "Erreur réseau" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  download,
  upload,
};
