import type { IncomingMessage } from "http";
import type { Response } from "express";

export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME?.trim() || "scbap_session";

const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === "true";
const AUTH_COOKIE_SAME_SITE =
  (process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase() as
    | "lax"
    | "strict"
    | "none"
    | "") || "lax";
const AUTH_COOKIE_MAX_AGE_MS = Number(
  process.env.AUTH_COOKIE_MAX_AGE_MS || `${12 * 60 * 60 * 1000}`,
);

function serializeCookie(name: string, value: string, attributes: string[]) {
  return `${name}=${encodeURIComponent(value)}; ${attributes.join("; ")}`;
}

export function setAuthCookie(res: Response, token: string) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    `SameSite=${AUTH_COOKIE_SAME_SITE[0].toUpperCase()}${AUTH_COOKIE_SAME_SITE.slice(1)}`,
    `Max-Age=${Math.floor(AUTH_COOKIE_MAX_AGE_MS / 1000)}`,
  ];

  if (AUTH_COOKIE_SECURE) {
    attributes.push("Secure");
  }

  res.setHeader("Set-Cookie", serializeCookie(AUTH_COOKIE_NAME, token, attributes));
}

export function clearAuthCookie(res: Response) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    `SameSite=${AUTH_COOKIE_SAME_SITE[0].toUpperCase()}${AUTH_COOKIE_SAME_SITE.slice(1)}`,
    "Max-Age=0",
  ];

  if (AUTH_COOKIE_SECURE) {
    attributes.push("Secure");
  }

  res.setHeader("Set-Cookie", serializeCookie(AUTH_COOKIE_NAME, "", attributes));
}

export function parseCookieHeader(cookieHeader?: string | null) {
  const cookies = new Map<string, string>();
  if (!cookieHeader) {
    return cookies;
  }

  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = segment.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    cookies.set(rawName, decodeURIComponent(rawValue));
  }

  return cookies;
}

export function getAuthCookieToken(request: IncomingMessage) {
  const cookies = parseCookieHeader(request.headers.cookie);
  return cookies.get(AUTH_COOKIE_NAME)?.trim() || null;
}
