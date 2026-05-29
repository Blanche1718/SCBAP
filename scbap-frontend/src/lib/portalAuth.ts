const PORTAL_TOKEN_KEY = "scbap:portal-token";

export function getPortalToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function clearPortalToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PORTAL_TOKEN_KEY);
}
