const AUTH_TOKEN_KEY = "scbap:auth-token";

let memoryToken: string | null = null;

function hasWindow() {
  return typeof window !== "undefined";
}

export function getStoredAuthToken() {
  if (memoryToken) {
    return memoryToken;
  }

  if (!hasWindow()) {
    return null;
  }

  memoryToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return memoryToken;
}

export function setStoredAuthToken(token: string) {
  memoryToken = token;

  if (hasWindow()) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearStoredAuthToken() {
  memoryToken = null;

  if (hasWindow()) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
