import type { IncomingMessage, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { HttpError } from "../errorHandler";
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

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatPersonName(dossier: { nom?: string | null; prenom?: string | null }) {
  return [dossier.prenom, dossier.nom].filter(Boolean).join(" ").trim() || "Bénéficiaire";
}

function normalizePolygons(raw: unknown): [number, number][][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  const first = raw[0];
  const isCoordinate = (item: unknown): item is [number, number] =>
    Array.isArray(item) &&
    item.length >= 2 &&
    typeof item[0] === "number" &&
    typeof item[1] === "number";

  if (isCoordinate(first)) {
    return [raw as [number, number][]];
  }

  if (Array.isArray(first) && isCoordinate(first[0])) {
    return raw as [number, number][][];
  }

  return [];
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

async function buildSnapshot(access?: { scopeJurisdictionId?: string | null }): Promise<LiveSnapshot> {
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
      latitude: Number(latestPosition?.latitude ?? 0),
      longitude: Number(latestPosition?.longitude ?? 0),
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
      const rawUser = await getAuthenticatedUserById(payload.sub);
      const user = toAuthenticatedUser(rawUser);
      const requestedJurisdiction = parseRequestedJurisdiction(request);
      const scopeJurisdictionId = resolveScopeJurisdictionId(user, requestedJurisdiction);
      const client: ConnectedClient = {
        socket,
        scopeJurisdictionId,
      };

      clients.add(client);

      try {
        const snapshot = await buildSnapshot({ scopeJurisdictionId });
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

  return buildSnapshot({ scopeJurisdictionId: scope?.jurisdictionId });
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

  return buildSnapshot({ scopeJurisdictionId: scope?.jurisdictionId });
}

export async function getSurveillanceSnapshot(access?: { scopeJurisdictionId?: string | null }) {
  lastUpdated = lastUpdated ?? new Date().toISOString();
  return buildSnapshot(access);
}
