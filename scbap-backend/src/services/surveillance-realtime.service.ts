import type { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { HttpError } from "../errorHandler";
import { getAuthCookieToken } from "../auth/auth-cookie";
import { getAuthenticatedUserById, verifyAuthToken } from "../auth/auth.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { getUserJuridictionCode } from "../utils/juridiction";
import prisma from "../prisma";

type LiveTrack = {
  id: string;
  deviceId: string;
  userId: string;
  name: string;
  sex: "M" | "F" | null;
  compliance: "COMPLIANT" | "AT_RISK" | "VIOLATION" | "IDLE";
  risk: "HIGH" | "MEDIUM" | "LOW";
  batteryPct: number;
  signalDbm: number;
  lastPing: string;
  latitude: number;
  longitude: number;
  zoneStatus: "INSIDE" | "OUTSIDE" | "TRANSITION";
  zoneLabel: string;
  active: boolean;
  authorizedZones: Array<{
    id: string;
    name: string;
    type: "AUTORISEE" | "INTERDITE";
    polygons: [number, number][][];
  }>;
};

type LiveFeed = {
  id: string;
  time: string;
  type: string;
  priority: "CRITICAL" | "MAINTENANCE" | "INFO";
  beneficiary: string;
  message: string;
  deviceId: string;
};

type LiveSnapshot = {
  tracks: LiveTrack[];
  feed: LiveFeed[];
  connected: boolean;
  source: "BACKEND";
  lastUpdated: string | null;
};

type LiveTelemetryMessage = {
  type: "telemetry";
  payload: Record<string, unknown>;
};

type LiveAlertMessage = {
  type: "alert";
  payload: Record<string, unknown>;
};

type LiveSnapshotMessage = {
  type: "snapshot";
  payload: LiveSnapshot;
};

let wsServer: WebSocketServer | null = null;
type ConnectedClient = {
  socket: WebSocket;
  scopeJurisdictionId?: string | null;
};

const clients = new Set<ConnectedClient>();
let lastUpdated: string | null = null;

const SURVEILLANCE_BOUNDS = {
  minLat: 5.4,
  maxLat: 13.9,
  minLng: -1.9,
  maxLng: 4.8,
};

const JURISDICTION_CENTERS: Record<string, { lat: number; lng: number }> = {
  Cotonou: { lat: 6.3703, lng: 2.3912 },
  "Porto-Novo": { lat: 6.4969, lng: 2.6289 },
  Parakou: { lat: 9.3372, lng: 2.6303 },
  Abomey: { lat: 7.1829, lng: 1.9917 },
  Natitingou: { lat: 10.3042, lng: 1.3794 },
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatPersonName(dossier: { nom?: string | null; prenom?: string | null }) {
  return [dossier.prenom, dossier.nom].filter(Boolean).join(" ").trim() || "Bénéficiaire";
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isCoordinate(item: unknown): item is [number, number] {
  return (
    Array.isArray(item) &&
    item.length >= 2 &&
    typeof item[0] === "number" &&
    typeof item[1] === "number"
  );
}

function normalizeCoordinate(item: unknown, source: "RAW" | "GEOJSON" = "RAW"): [number, number] | null {
  if (!isCoordinate(item)) {
    return null;
  }

  const [first, second] = item;
  return source === "GEOJSON" ? [second, first] : [first, second];
}

function normalizeRing(raw: unknown, source: "RAW" | "GEOJSON" = "RAW"): [number, number][] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((point) => normalizeCoordinate(point, source))
    .filter((point): point is [number, number] => Boolean(point));
}

function normalizePolygons(value: unknown): [number, number][][] {
  const raw = parseJsonValue(value);

  if (!raw) {
    return [];
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const geometry = raw as {
      type?: unknown;
      geometry?: unknown;
      coordinates?: unknown;
    };

    if (geometry.geometry) {
      return normalizePolygons(geometry.geometry);
    }

    if ("polygons" in geometry) {
      return normalizePolygons((geometry as { polygons?: unknown }).polygons);
    }

    if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
      const ring = normalizeRing(geometry.coordinates[0], "GEOJSON");
      return ring.length >= 3 ? [ring] : [];
    }

    if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates
        .map((polygon) => normalizeRing(Array.isArray(polygon) ? polygon[0] : null, "GEOJSON"))
        .filter((ring) => ring.length >= 3);
    }

    if (geometry.coordinates) {
      return normalizePolygons(geometry.coordinates);
    }

    return [];
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  const first = raw[0];

  if (isCoordinate(first)) {
    const ring = normalizeRing(raw);
    return ring.length >= 3 ? [ring] : [];
  }

  if (Array.isArray(first) && isCoordinate(first[0])) {
    return raw
      .map((ring) => normalizeRing(ring))
      .filter((ring) => ring.length >= 3);
  }

  if (
    Array.isArray(first) &&
    Array.isArray(first[0]) &&
    first[0].length > 0 &&
    isCoordinate(first[0][0])
  ) {
    return raw
      .map((polygon) => normalizeRing(Array.isArray(polygon) ? polygon[0] : null))
      .filter((ring) => ring.length >= 3);
  }

  return [];
}

function isWithinSurveillanceBounds(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SURVEILLANCE_BOUNDS.minLat &&
    lat <= SURVEILLANCE_BOUNDS.maxLat &&
    lng >= SURVEILLANCE_BOUNDS.minLng &&
    lng <= SURVEILLANCE_BOUNDS.maxLng
  );
}

function getPolygonCentroid(polygons: [number, number][][]) {
  const points = polygons.flat();
  if (points.length === 0) {
    return null;
  }

  const totals = points.reduce(
    (acc, [lat, lng]) => ({
      lat: acc.lat + lat,
      lng: acc.lng + lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

function isPointInsidePolygon(point: { lat: number; lng: number }, polygon: [number, number][]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects =
      lngI > point.lng !== lngJ > point.lng &&
      point.lat < ((latJ - latI) * (point.lng - lngI)) / (lngJ - lngI) + latI;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInsidePolygons(point: { lat: number; lng: number }, polygons: [number, number][][]) {
  return polygons.some((polygon) => polygon.length >= 3 && isPointInsidePolygon(point, polygon));
}

function getJurisdictionCenter(dossier: { juridictionId?: string | null; juridiction?: { nom?: string | null } | null }) {
  const candidates = [dossier.juridiction?.nom, dossier.juridictionId].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const center = JURISDICTION_CENTERS[candidate];
    if (center) {
      return center;
    }
  }

  return JURISDICTION_CENTERS.Cotonou;
}

function getDeterministicOffset(seed: string) {
  const codeSum = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const latStep = ((codeSum % 7) - 3) * 0.012;
  const lngStep = (((Math.floor(codeSum / 7) % 7) - 3) * 0.012);

  return {
    lat: latStep,
    lng: lngStep,
  };
}

function clampToSurveillanceBounds(point: { lat: number; lng: number }) {
  return {
    lat: Math.min(Math.max(point.lat, SURVEILLANCE_BOUNDS.minLat), SURVEILLANCE_BOUNDS.maxLat),
    lng: Math.min(Math.max(point.lng, SURVEILLANCE_BOUNDS.minLng), SURVEILLANCE_BOUNDS.maxLng),
  };
}

function resolveDisplayPosition(args: {
  latestPosition: any;
  authorizedZones: Array<{ polygons: [number, number][][] }>;
  dossier: any;
  seed: string;
  zoneStatus: LiveTrack["zoneStatus"];
}) {
  const rawLat = Number(args.latestPosition?.latitude);
  const rawLng = Number(args.latestPosition?.longitude);
  const authorizedPolygons = args.authorizedZones.flatMap((zone) => zone.polygons);
  const zoneCentroid = getPolygonCentroid(authorizedPolygons);

  if (isWithinSurveillanceBounds(rawLat, rawLng)) {
    if (
      args.zoneStatus === "INSIDE" &&
      zoneCentroid &&
      !isPointInsidePolygons({ lat: rawLat, lng: rawLng }, authorizedPolygons)
    ) {
      return zoneCentroid;
    }

    return { lat: rawLat, lng: rawLng };
  }

  const base = zoneCentroid ?? getJurisdictionCenter(args.dossier);
  const offset = getDeterministicOffset(args.seed);

  if (args.zoneStatus === "INSIDE" && zoneCentroid) {
    return zoneCentroid;
  }

  const violationOffset = args.zoneStatus === "OUTSIDE" ? 0.06 : 0;

  return clampToSurveillanceBounds({
    lat: base.lat + offset.lat + violationOffset,
    lng: base.lng + offset.lng + violationOffset,
  });
}

function priorityFromAlertLevel(level?: string | null) {
  if (level === "CRITIQUE") return "CRITICAL";
  if (level === "NORMALE") return "MAINTENANCE";
  return "INFO";
}

function complianceFromPosition(params: {
  batteryPct: number;
  zoneStatus: string | null;
  geofenceBreach: boolean | null;
  active: boolean;
}) {
  if (params.geofenceBreach || params.zoneStatus === "OUTSIDE") {
    return "VIOLATION" as const;
  }

  if (params.batteryPct < 15) {
    return "AT_RISK" as const;
  }

  if (!params.active) {
    return "IDLE" as const;
  }

  return "COMPLIANT" as const;
}

function riskFromCompliance(compliance: LiveTrack["compliance"]) {
  if (compliance === "VIOLATION") return "HIGH" as const;
  if (compliance === "AT_RISK") return "MEDIUM" as const;
  return "LOW" as const;
}

function getSignalValue(position: {
  gprsSignal: number | null;
  rssiDbm: number | null;
}) {
  return position.gprsSignal ?? position.rssiDbm ?? -90;
}

function getZoneLabel(zoneStatus: string | null, zoneName?: string | null) {
  if (zoneStatus === "OUTSIDE") return "Hors périmètre";
  if (zoneName) return zoneName;
  return zoneStatus ?? "Zone inconnue";
}

function parseRequestUrl(request: IncomingMessage) {
  const host = request.headers.host ?? "localhost";
  return new URL(request.url ?? "/", `http://${host}`);
}

function parseWsAuthToken(request: IncomingMessage) {
  const url = parseRequestUrl(request);
  const queryToken = url.searchParams.get("token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  const cookieToken = getAuthCookieToken(request);
  if (cookieToken) {
    return cookieToken;
  }

  const authorization = request.headers.authorization;
  if (!authorization) {
    throw new HttpError(401, "Token manquant");
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Token invalide");
  }

  return token.trim();
}

function parseRequestedJurisdiction(request: IncomingMessage) {
  const url = parseRequestUrl(request);
  const raw = url.searchParams.get("juridiction") ?? url.searchParams.get("jurisdiction");
  const trimmed = raw?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function toAuthenticatedUser(user: Awaited<ReturnType<typeof getAuthenticatedUserById>>): AuthenticatedUser {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    telephone: user.telephone,
    statut: user.statut,
    createdAt: user.createdAt.toISOString(),
    role: {
      id: user.role.id,
      nom: user.role.nom,
    },
    structure: {
      id: user.structure.id,
      nom: user.structure.nom,
      code: user.structure.code,
      type: user.structure.type,
      juridiction: user.structure.juridiction,
    },
  };
}

function resolveScopeJurisdictionId(user: AuthenticatedUser, requestedJurisdiction: string | null) {
  if (user.role.nom === "ADMIN") {
    return getUserJuridictionCode(requestedJurisdiction) ?? undefined;
  }

  return getUserJuridictionCode(user.structure.juridiction) ?? "__NO_ACCESS__";
}

function buildDossierScopeWhere(jurisdictionId?: string | null) {
  return {
    deletedAt: null,
    ...(jurisdictionId ? { juridictionId: jurisdictionId } : {}),
  };
}

function buildBraceletScopeWhere(jurisdictionId?: string | null) {
  if (!jurisdictionId) {
    return undefined;
  }

  return {
    affectations: {
      some: {
        beneficiaire: {
          is: {
            dossier: {
              is: buildDossierScopeWhere(jurisdictionId),
            },
          },
        },
      },
    },
  };
}

function buildAlertScopeWhere(jurisdictionId?: string | null) {
  if (!jurisdictionId) {
    return {};
  }

  return {
    beneficiaire: {
      is: {
        dossier: {
          is: buildDossierScopeWhere(jurisdictionId),
        },
      },
    },
  };
}

function clientCanReceive(client: ConnectedClient, eventJurisdictionId?: string | null) {
  if (!client.scopeJurisdictionId) {
    return true;
  }

  if (!eventJurisdictionId) {
    return false;
  }

  return client.scopeJurisdictionId === eventJurisdictionId;
}

export async function buildSurveillanceSnapshot(
  access?: { scopeJurisdictionId?: string | null },
): Promise<LiveSnapshot> {
  const braceletWhere = buildBraceletScopeWhere(access?.scopeJurisdictionId);
  const bracelets = (await prisma.bracelet.findMany({
    ...(braceletWhere ? { where: braceletWhere } : {}),
    orderBy: { codeImei: "asc" },
    include: {
      affectations: {
        orderBy: { dateDebut: "desc" },
        take: 1,
        include: {
          beneficiaire: {
            include: {
              dossier: true,
              zones: true,
              positionsGPS: {
                orderBy: { dateHeure: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  })) as Array<any>;

  const tracks: LiveTrack[] = [];
  for (const bracelet of bracelets) {
    const affectation = bracelet.affectations?.[0];
    const beneficiaire = affectation?.beneficiaire;
    if (!affectation || !beneficiaire) {
      continue;
    }

    const latestPosition = beneficiaire.positionsGPS?.[0] ?? null;
    const authorizedZones = (beneficiaire.zones ?? [])
      .filter((zone: any) => zone.type === "AUTORISEE")
      .map((zone: any) => ({
        id: zone.id,
        name: zone.nom,
        type: "AUTORISEE" as const,
        polygons: normalizePolygons(zone.geometrie),
      }));

    const batteryPct = latestPosition?.batterie ?? 100;
    const zoneStatus = (latestPosition?.zoneStatus ?? "INSIDE") as LiveTrack["zoneStatus"];
    const compliance = complianceFromPosition({
      batteryPct,
      zoneStatus,
      geofenceBreach: latestPosition?.geofenceBreach ?? null,
      active: bracelet.statut === "AFFECTE",
    });
    const dossier = beneficiaire.dossier;
    const displayPosition = resolveDisplayPosition({
      latestPosition,
      authorizedZones,
      dossier,
      seed: bracelet.codeImei,
      zoneStatus,
    });

    tracks.push({
      id: beneficiaire.id,
      deviceId: bracelet.codeImei,
      userId: dossier.numeroDossier,
      name: formatPersonName(dossier),
      sex: (dossier.sexe as "M" | "F" | null) ?? null,
      compliance,
      risk: riskFromCompliance(compliance),
      batteryPct,
      signalDbm: getSignalValue({
        gprsSignal: latestPosition?.gprsSignal ?? null,
        rssiDbm: latestPosition?.rssiDbm ?? null,
      }),
      lastPing: (latestPosition?.dateHeure ?? bracelet.dernierSignalLe ?? new Date()).toISOString(),
      latitude: displayPosition.lat,
      longitude: displayPosition.lng,
      zoneStatus,
      zoneLabel: getZoneLabel(zoneStatus, latestPosition?.zoneExterneId ?? authorizedZones[0]?.name),
      active: bracelet.statut === "AFFECTE",
      authorizedZones,
    });
  }

  const alertes = (await prisma.alerteSurveillance.findMany({
    where: buildAlertScopeWhere(access?.scopeJurisdictionId),
    orderBy: { declencheeLe: "desc" },
    take: 8,
    include: {
      beneficiaire: {
        include: {
          dossier: true,
        },
      },
      bracelet: true,
    },
  })) as Array<any>;

  const feed: LiveFeed[] = alertes.map((alerte) => ({
    id: alerte.id,
    time: alerte.declencheeLe.toISOString(),
    type: alerte.type,
    priority: priorityFromAlertLevel(alerte.niveau),
    beneficiary: formatPersonName(alerte.beneficiaire.dossier),
    message: alerte.message,
    deviceId: alerte.bracelet?.codeImei ?? alerte.beneficiaireId,
  }));

  return {
    tracks,
    feed,
    connected: true,
    source: "BACKEND",
    lastUpdated,
  };
}

function sendJson(socket: WebSocket, message: LiveTelemetryMessage | LiveSnapshotMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendLiveMessage(
  socket: WebSocket,
  message: LiveTelemetryMessage | LiveSnapshotMessage | LiveAlertMessage,
) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function initializeSurveillanceRealtime(server: Server) {
  if (wsServer) {
    return wsServer;
  }

  wsServer = new WebSocketServer({ server, path: "/ws/surveillance" });

  wsServer.on("connection", async (socket, request) => {
    try {
      const token = parseWsAuthToken(request);
      const payload = verifyAuthToken(token);
      const rawUser = await getAuthenticatedUserById(payload.sub, payload.sessionVersion);
      const user = toAuthenticatedUser(rawUser);
      const requestedJurisdiction = parseRequestedJurisdiction(request);
      const scopeJurisdictionId = resolveScopeJurisdictionId(user, requestedJurisdiction);
      const client: ConnectedClient = {
        socket,
        scopeJurisdictionId,
      };

      clients.add(client);

      try {
        const snapshot = await buildSurveillanceSnapshot({ scopeJurisdictionId });
        sendJson(socket, { type: "snapshot", payload: snapshot });
      } catch (error) {
        console.error("[surveillance-ws] snapshot error", error);
      }

      socket.on("close", () => {
        clients.delete(client);
      });

      socket.on("error", () => {
        clients.delete(client);
      });
    } catch (error) {
      console.error("[surveillance-ws] connection rejected", error);
      try {
        socket.close(1008, "Unauthorized");
      } catch {
        // no-op
      }
    }
  });

  return wsServer;
}

export async function broadcastSurveillanceTelemetry(
  payload: Record<string, unknown>,
  scope?: { jurisdictionId?: string | null },
) {
  lastUpdated = new Date().toISOString();
  const message: LiveTelemetryMessage = {
    type: "telemetry",
    payload,
  };

  for (const client of clients) {
    if (clientCanReceive(client, scope?.jurisdictionId)) {
      sendJson(client.socket, message);
    }
  }

  return buildSurveillanceSnapshot({ scopeJurisdictionId: scope?.jurisdictionId });
}

export async function broadcastSurveillanceAlert(
  payload: Record<string, unknown>,
  scope?: { jurisdictionId?: string | null },
) {
  lastUpdated = new Date().toISOString();
  const message: LiveAlertMessage = {
    type: "alert",
    payload,
  };

  for (const client of clients) {
    if (clientCanReceive(client, scope?.jurisdictionId)) {
      sendLiveMessage(client.socket, message);
    }
  }

  return buildSurveillanceSnapshot({ scopeJurisdictionId: scope?.jurisdictionId });
}

export async function getSurveillanceSnapshot(access?: { scopeJurisdictionId?: string | null }) {
  lastUpdated = lastUpdated ?? new Date().toISOString();
  return buildSurveillanceSnapshot(access);
}
