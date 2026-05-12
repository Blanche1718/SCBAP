import React, { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "../../components/ui";
import { api } from "../../lib/api";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import L, { type LatLngExpression } from "leaflet";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Search,
  Wifi,
} from "lucide-react";
import type { Beneficiaire, Zone } from "../../types";
import { formatInAppTimeZone } from "../../utils/timezone";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
type ComplianceStatus = "COMPLIANT" | "AT_RISK" | "VIOLATION" | "IDLE";
type ZoneStatus = "INSIDE" | "OUTSIDE" | "TRANSITION";
type FeedPriority = "CRITICAL" | "MAINTENANCE" | "INFO";

type Track = {
  id: string;
  deviceId: string;
  userId: string;
  name: string;
  sex?: "M" | "F" | null;
  compliance: ComplianceStatus;
  risk: RiskLevel;
  batteryPct: number;
  signalDbm: number;
  lastPing: string;
  latitude: number;
  longitude: number;
  zoneStatus: ZoneStatus;
  zoneLabel: string;
  active: boolean;
  authorizedZones: SurveillanceZone[];
};

type FeedEvent = {
  id: string;
  time: string;
  type: string;
  priority: FeedPriority;
  beneficiary: string;
  message: string;
  deviceId: string;
};

type TelemetryPayload = {
  device_id: string;
  user_id?: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    zone_status?: ZoneStatus;
    zone_id?: string;
  };
  health: {
    battery_pct?: number;
    gprs_signal?: number;
    gps_satellites?: number;
  };
  alerts: {
    strap_status?: number;
    geofence_breach?: boolean;
    gps_lost?: boolean;
    gprs_lost?: boolean;
    case_tamper?: boolean;
    power_loss?: boolean;
  };
  status: string;
};

type SurveillanceMessage =
  | {
      type: "snapshot";
      payload: SurveillanceSnapshot;
    }
  | {
      type: "telemetry";
      payload: TelemetryPayload;
    }
  | {
      type: "feed";
      payload: Record<string, unknown>;
    };

type SurveillanceSnapshot = {
  tracks: Track[];
  feed: FeedEvent[];
  connected: boolean;
  source: "DEMO" | "WEBSOCKET";
  lastUpdated: string | null;
};

type SurveillanceZone = {
  id: string;
  name: string;
  type: "AUTORISEE" | "INTERDITE";
  polygons: LatLngExpression[][];
};

const BASE_TRACKS: Track[] = [
  {
    id: "track-1",
    deviceId: "BR-SEED-001",
    userId: "DET-2024-883",
    name: "Kokou A.",
    sex: "M",
    compliance: "COMPLIANT",
    risk: "LOW",
    batteryPct: 84,
    signalDbm: -76,
    lastPing: new Date(Date.now() - 35_000).toISOString(),
    latitude: 6.3703,
    longitude: 2.3912,
    zoneStatus: "INSIDE",
    zoneLabel: "Maison autorisée",
    active: true,
    authorizedZones: [
      {
        id: "kokou-home",
        name: "Domicile",
        type: "AUTORISEE",
        polygons: [
          [
            [6.349, 2.365],
            [6.349, 2.392],
            [6.373, 2.392],
            [6.373, 2.365],
          ],
        ],
      },
      {
        id: "kokou-work",
        name: "Atelier",
        type: "AUTORISEE",
        polygons: [
          [
            [6.401, 2.401],
            [6.401, 2.423],
            [6.419, 2.423],
            [6.419, 2.401],
          ],
        ],
      },
    ],
  },
  {
    id: "track-2",
    deviceId: "BR-SEED-002",
    userId: "DET-2024-884",
    name: "Fifame D.",
    sex: "F",
    compliance: "AT_RISK",
    risk: "MEDIUM",
    batteryPct: 19,
    signalDbm: -91,
    lastPing: new Date(Date.now() - 78_000).toISOString(),
    latitude: 6.4521,
    longitude: 2.3487,
    zoneStatus: "TRANSITION",
    zoneLabel: "Périmètre de suivi",
    active: true,
    authorizedZones: [
      {
        id: "fifame-home",
        name: "Résidence",
        type: "AUTORISEE",
        polygons: [
          [
            [6.426, 2.314],
            [6.426, 2.339],
            [6.447, 2.339],
            [6.447, 2.314],
          ],
        ],
      },
      {
        id: "fifame-care",
        name: "Centre de suivi",
        type: "AUTORISEE",
        polygons: [
          [
            [6.462, 2.354],
            [6.462, 2.372],
            [6.478, 2.372],
            [6.478, 2.354],
          ],
        ],
      },
    ],
  },
  {
    id: "track-3",
    deviceId: "BR-SEED-003",
    userId: "DET-2024-885",
    name: "Severin M.",
    sex: "M",
    compliance: "VIOLATION",
    risk: "HIGH",
    batteryPct: 11,
    signalDbm: -109,
    lastPing: new Date(Date.now() - 120_000).toISOString(),
    latitude: 6.2202,
    longitude: 2.4143,
    zoneStatus: "OUTSIDE",
    zoneLabel: "Zone interdite",
    active: true,
    authorizedZones: [
      {
        id: "severin-radius",
        name: "Rayon autorisé",
        type: "AUTORISEE",
        polygons: [
          [
            [6.205, 2.395],
            [6.205, 2.428],
            [6.236, 2.428],
            [6.236, 2.395],
          ],
        ],
      },
    ],
  },
  {
    id: "track-4",
    deviceId: "BR-SEED-004",
    userId: "DET-2024-886",
    name: "Rachidath O.",
    sex: "F",
    compliance: "IDLE",
    risk: "LOW",
    batteryPct: 63,
    signalDbm: -82,
    lastPing: new Date(Date.now() - 15_000).toISOString(),
    latitude: 6.3831,
    longitude: 2.4191,
    zoneStatus: "INSIDE",
    zoneLabel: "Domicile",
    active: false,
    authorizedZones: [
      {
        id: "rachidath-home",
        name: "Domicile",
        type: "AUTORISEE",
        polygons: [
          [
            [6.373, 2.401],
            [6.373, 2.431],
            [6.392, 2.431],
            [6.392, 2.401],
          ],
        ],
      },
    ],
  },
];

function formatAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(diff) || diff < 0) {
    return "à l’instant";
  }

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function formatClock(timestamp: string) {
  return formatInAppTimeZone(new Date(timestamp), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function complianceLabel(status: ComplianceStatus) {
  switch (status) {
    case "COMPLIANT":
      return { text: "Conforme", variant: "compliant" as const };
    case "AT_RISK":
      return { text: "Risque", variant: "inactive" as const };
    case "VIOLATION":
      return { text: "Violation", variant: "alert" as const };
    case "IDLE":
    default:
      return { text: "Inactif", variant: "inactive" as const };
  }
}

function priorityLabel(priority: FeedPriority) {
  return {
    CRITICAL: { text: "Critique", tone: "bg-[#93000a] text-white" },
    MAINTENANCE: { text: "Maintenance", tone: "bg-[#d97706] text-white" },
    INFO: { text: "Info", tone: "bg-[#17362e] text-white" },
  }[priority];
}

function offsetPolygon(polygon: LatLngExpression[], offsetLat: number, offsetLng: number) {
  return polygon.map((point) => {
    if (Array.isArray(point)) {
      const [lat, lng] = point;
      return [lat + offsetLat, lng + offsetLng] as LatLngExpression;
    }

    const latLng = point as { lat: number; lng: number };
    return [latLng.lat + offsetLat, latLng.lng + offsetLng] as LatLngExpression;
  });
}

function isCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function normalizeZonePolygons(value: unknown): LatLngExpression[][] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const first = value[0];
  if (isCoordinate(first)) {
    return [value as LatLngExpression[]];
  }

  if (Array.isArray(first) && first.length > 0 && isCoordinate(first[0])) {
    return value as LatLngExpression[][];
  }

  return [];
}

function mapZoneFromBeneficiaire(zone: Zone): SurveillanceZone {
  return {
    id: zone.id,
    name: zone.nom,
    type: zone.type,
    polygons: normalizeZonePolygons(zone.geometrie),
  };
}

function batteryTone(value: number) {
  if (value < 15) return "text-error-container";
  if (value < 35) return "text-amber-700";
  return "text-primary";
}

function PersonAvatar({ sex }: { sex?: "M" | "F" | null }) {
  const skin = sex === "F" ? "#f3c5a6" : sex === "M" ? "#efc4a5" : "#f2c7a7";
  const hair = sex === "F" ? "#f26522" : sex === "M" ? "#8a4b3f" : "#334155";
  const shirt = sex === "F" ? "#8b3a62" : sex === "M" ? "#0f7a8a" : "#49627a";

  return (
    <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="31" fill="#d9e3ea" />

      {sex === "F" ? (
        <>
          <path
            d="M20 24c0-10 6.5-16 12-16s12 6 12 16c0 6-2 11-4 14-1 2-2 4-8 4s-7-2-8-4c-2-3-4-8-4-14Z"
            fill={hair}
          />
          <path d="M17 49c2-10 8-14 15-14s13 4 15 14v6H17z" fill={shirt} />
          <circle cx="32" cy="29" r="11" fill={skin} />
          <path d="M20 25c2-7 7-11 12-11s10 4 12 11" fill={hair} />
          <circle cx="27" cy="29" r="1.7" fill="#17362e" />
          <circle cx="37" cy="29" r="1.7" fill="#17362e" />
          <path d="M28 35c2 2 6 2 8 0" stroke="#b54857" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M22 44c3-4 7-6 10-6s7 2 10 6" fill="#7b2d52" opacity="0.25" />
        </>
      ) : sex === "M" ? (
        <>
          <path d="M20 52c2-11 8-17 12-17s10 6 12 17v4H20z" fill={shirt} />
          <circle cx="32" cy="27" r="11" fill={skin} />
          <path d="M21 23c1-7 6-13 11-13s10 6 11 13c-2-1-4-2-11-2s-9 1-11 2Z" fill={hair} />
          <path d="M21 26c1-6 6-10 11-10s10 4 11 10" fill={hair} />
          <circle cx="27" cy="27" r="1.7" fill="#17362e" />
          <circle cx="37" cy="27" r="1.7" fill="#17362e" />
          <path d="M28 34c2 1 6 1 8 0" stroke="#b54857" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M24 35h16" stroke="#7c4a2d" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M18 50c2-10 8-15 14-15s12 5 14 15v5H18z" fill={shirt} />
          <circle cx="32" cy="28" r="11" fill={skin} />
          <path d="M20 23c2-7 7-11 12-11s10 4 12 11c-2 1-4 1-6 1H26c-2 0-4 0-6-1Z" fill={hair} />
          <path d="M20 24c0-6 5-11 12-11s12 5 12 11c-3-1-6-1-12-1s-9 0-12 1Z" fill={hair} />
          <circle cx="27" cy="28" r="1.7" fill="#17362e" />
          <circle cx="37" cy="28" r="1.7" fill="#17362e" />
          <path d="M28 35c2 2 6 2 8 0" stroke="#b54857" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M24 39c4-3 12-3 16 0" stroke="#7b4a3a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

function createMarkerIcon(track: Track) {
  const color =
    track.compliance === "VIOLATION"
      ? "#b42318"
      : track.compliance === "AT_RISK"
        ? "#d97706"
        : track.active
          ? "#17362e"
          : "#64748b";
  const avatarMarkup = renderToStaticMarkup(<PersonAvatar sex={track.sex} />);

  return L.divIcon({
    className: "scbap-person-marker",
    html: `
      <div class="scbap-person-marker__core" style="
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
      ">
        <div style="
          width: 46px;
          height: 46px;
          border-radius: 999px;
          background: rgba(255,255,255,0.96);
          border: 3px solid ${color};
          box-shadow: 0 10px 22px rgba(15,23,42,0.24), 0 0 0 4px rgba(23,54,46,0.10);
          display: grid;
          place-items: center;
          transition: transform 160ms ease, box-shadow 160ms ease;
        ">
          <div style="width: 34px; height: 34px; overflow: hidden; border-radius: 999px;">
            ${avatarMarkup}
          </div>
        </div>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

function buildSnapshot(initial?: Partial<SurveillanceSnapshot>): SurveillanceSnapshot {
  return {
    tracks: initial?.tracks ?? BASE_TRACKS,
    feed: initial?.feed ?? [],
    connected: initial?.connected ?? true,
    source: initial?.source ?? "DEMO",
    lastUpdated: initial?.lastUpdated ?? new Date().toISOString(),
  };
}

function getSurveillanceWsUrl() {
  const explicitUrl = (import.meta.env.VITE_SURVEILLANCE_WS_URL as string | undefined)?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://localhost:3000/ws/surveillance";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/surveillance`;
}

function MainMap({ tracks }: { tracks: Track[] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map, tracks.length]);

  return null;
}

function SelectedTrackFocus({
  track,
  zones,
}: {
  track: Track | null;
  zones: SurveillanceZone[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!track) {
      return;
    }

    const points: LatLngExpression[] = [[track.latitude, track.longitude]];
    for (const zone of zones) {
      for (const polygon of zone.polygons) {
        points.push(...polygon);
      }
    }

    if (points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds.pad(0.22), {
      animate: true,
      duration: 0.75,
    });
  }, [map, track?.id, track?.latitude, track?.longitude, zones]);

  return null;
}

export default function GpsMapPage() {
  const [snapshot, setSnapshot] = useState<SurveillanceSnapshot>(() => buildSnapshot());
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | "ALL">("ALL");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTrackZones, setSelectedTrackZones] = useState<SurveillanceZone[]>([]);
  const [selectedTrackZonesError, setSelectedTrackZonesError] = useState<string | null>(null);
  const [selectedTrackZonesRawCount, setSelectedTrackZonesRawCount] = useState<number | null>(null);

  useEffect(() => {
    const wsUrl = getSurveillanceWsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setSnapshot((current) => ({ ...current, connected: true, source: "WEBSOCKET" }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SurveillanceMessage;
        if (message.type === "snapshot") {
          setSnapshot({
            ...message.payload,
            connected: true,
            source: "WEBSOCKET",
            lastUpdated: message.payload.lastUpdated ?? new Date().toISOString(),
          });
          return;
        }

        if (message.type === "telemetry") {
          const payload = message.payload;

          setSnapshot((current) => {
            const found = current.tracks.find((track) => track.deviceId === payload.device_id);
            if (!found) {
              return current;
            }

            const nextCompliance: ComplianceStatus =
              payload.alerts?.geofence_breach || payload.location.zone_status === "OUTSIDE"
                ? "VIOLATION"
                : (payload.health?.battery_pct ?? found.batteryPct) < 15
                  ? "AT_RISK"
                  : "COMPLIANT";

            const updatedTrack: Track = {
              ...found,
              latitude: payload.location.latitude,
              longitude: payload.location.longitude,
              batteryPct: payload.health?.battery_pct ?? found.batteryPct,
              signalDbm: payload.health?.gprs_signal ?? found.signalDbm,
              lastPing: payload.timestamp,
              zoneStatus: payload.location.zone_status ?? found.zoneStatus,
              compliance: nextCompliance,
            };

            const liveFeed: FeedEvent = {
              id: `${Date.now()}`,
              time: payload.timestamp,
              type:
                nextCompliance === "VIOLATION"
                  ? "Violation de zone"
                  : nextCompliance === "AT_RISK"
                    ? "Batterie faible"
                    : "Signal reçu",
              priority:
                nextCompliance === "VIOLATION"
                  ? "CRITICAL"
                  : nextCompliance === "AT_RISK"
                    ? "MAINTENANCE"
                    : "INFO",
              beneficiary: found.name,
              message:
                nextCompliance === "VIOLATION"
                  ? "Le bracelet a déclenché une violation de zone"
                  : nextCompliance === "AT_RISK"
                    ? "Niveau batterie sous seuil"
                    : "Télémétrie reçue via WebSocket",
              deviceId: found.deviceId,
            };

            return {
              ...current,
              tracks: current.tracks.map((track) =>
                track.id === found.id ? updatedTrack : track,
              ),
              feed: [liveFeed, ...current.feed].slice(0, 8),
              connected: true,
              source: "WEBSOCKET",
              lastUpdated: new Date().toISOString(),
            };
          });
        }

        if (message.type === "feed") {
          const payload = message.payload;
          setSnapshot((current) => ({
            ...current,
            feed: [
              {
                id: `${Date.now()}`,
                time: new Date().toISOString(),
                type: String(payload.type ?? "Evènement"),
                priority: (String(payload.priority ?? "INFO").toUpperCase() as FeedPriority) ?? "INFO",
                beneficiary: String(payload.beneficiary ?? "Bracelet"),
                message: String(payload.message ?? "Nouvel événement reçu"),
                deviceId: String(payload.deviceId ?? "N/A"),
              },
              ...current.feed,
            ].slice(0, 8),
            lastUpdated: new Date().toISOString(),
          }));
        }
      } catch {
        // On ignore les messages non conformes pendant la phase de montage.
      }
    };

    ws.onclose = () => {
      setSnapshot((current) => ({ ...current, connected: false }));
    };

    ws.onerror = () => {
      setSnapshot((current) => ({ ...current, connected: false }));
    };

    return () => ws.close();
  }, []);

  const filteredTracks = useMemo(() => {
    return snapshot.tracks.filter((track) => {
      const matchesRisk = selectedRisk === "ALL" ? true : track.risk === selectedRisk;
      const matchesQuery =
        query.trim().length === 0
          ? true
          : [
              track.name,
              track.deviceId,
              track.userId,
              track.zoneLabel,
              track.compliance,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase());

      return matchesRisk && matchesQuery;
    });
  }, [query, selectedRisk, snapshot.tracks]);

  const selectedTrack = selectedTrackId
    ? filteredTracks.find((track) => track.id === selectedTrackId) ??
      snapshot.tracks.find((track) => track.id === selectedTrackId) ??
      null
    : null;
  const selectedAuthorizedZones = useMemo(() => {
    if (selectedTrackZones.length > 0) {
      return selectedTrackZones;
    }

    return selectedTrack?.authorizedZones ?? [];
  }, [selectedTrack?.authorizedZones, selectedTrackZones]);
  const kpis = useMemo(() => {
    const active = snapshot.tracks.filter((track) => track.active).length;
    const violations = snapshot.tracks.filter((track) => track.compliance === "VIOLATION").length;
    const lowBattery = snapshot.tracks.filter((track) => track.batteryPct < 15).length;
    return { active, violations, lowBattery };
  }, [snapshot.tracks]);

  const mapCenter: LatLngExpression = [6.365, 2.395];

  useEffect(() => {
    setShowDetails(false);
  }, [selectedTrackId]);

  useEffect(() => {
    const beneficiaireId = selectedTrack?.id;

    if (!beneficiaireId) {
      setSelectedTrackZones([]);
      setSelectedTrackZonesError(null);
      setSelectedTrackZonesRawCount(null);
      return;
    }

    let cancelled = false;
    setSelectedTrackZones([]);
    setSelectedTrackZonesError(null);
    setSelectedTrackZonesRawCount(null);

    async function loadSelectedTrackZones() {
      try {
        const response = await api.get<{
          message: string;
          data: Beneficiaire;
        }>(`/beneficiaires/${beneficiaireId}`);

        if (cancelled) {
          return;
        }

        console.log("[surveillance] beneficiaire charge", {
          beneficiaireId,
          zones: response.data.zones,
        });

        setSelectedTrackZonesRawCount(response.data.zones?.length ?? 0);

        const authorizedZones = (response.data.zones ?? [])
          .filter((zone) => zone.type === "AUTORISEE")
          .map(mapZoneFromBeneficiaire)
          .filter((zone) => zone.polygons.length > 0);

        console.log("[surveillance] zones autorisees normalisees", {
          beneficiaireId,
          authorizedZones,
        });

        setSelectedTrackZones(authorizedZones);
      } catch (error) {
        if (!cancelled) {
          setSelectedTrackZones([]);
          setSelectedTrackZonesError((error as Error).message);
          setSelectedTrackZonesRawCount(null);
        }

        console.error("[surveillance] impossible de charger les zones du beneficiaire", {
          beneficiaireId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void loadSelectedTrackZones();

    return () => {
      cancelled = true;
    };
  }, [selectedTrack?.id]);

  return (
    <div className="h-full min-h-[calc(100vh-4rem)] bg-surface">
      <div className="grid h-full min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-r border-outline-variant bg-[#edf4f0] px-4 py-4 sm:px-5 sm:py-5 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-on-surface-variant">
                  GPS Map
                </p>
                <h1 className="text-2xl font-bold text-on-surface">Surveillance temps réel</h1>
              </div>
              <Badge variant={snapshot.connected ? "compliant" : "inactive"}>
                {snapshot.source}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              {snapshot.connected
                ? `Dernière mise à jour ${snapshot.lastUpdated ? formatAgo(snapshot.lastUpdated) : "à l’instant"}`
                : "Connexion temps réel interrompue"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <Card className="border border-white/70 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Bracelets actifs
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-on-surface">{kpis.active}</p>
                </div>
                <div className="rounded-full bg-primary-fixed p-2.5 text-primary">
                  <Activity size={16} />
                </div>
              </div>
            </Card>

            <Card className="border border-white/70 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Violations de zone
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-error-container">{kpis.violations}</p>
                </div>
                <div className="rounded-full bg-error-container/80 p-2.5 text-on-error-container">
                  <AlertTriangle size={16} />
                </div>
              </div>
            </Card>

            <Card className="border border-white/70 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Batterie faible
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-700">{kpis.lowBattery}</p>
                </div>
                <div className="rounded-full bg-amber-100 p-2.5 text-amber-700">
                  <BatteryCharging size={16} />
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Rechercher un porteur
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, device_id, zone..."
                className="w-full rounded-lg border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none transition focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Filtrer par risque
            </label>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((risk) => {
                const active = selectedRisk === risk;
                const labels = {
                  ALL: "Tous",
                  HIGH: "Haut",
                  MEDIUM: "Moyen",
                  LOW: "Faible",
                };
                return (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => setSelectedRisk(risk)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-on-surface-variant hover:bg-surface-high"
                    }`}
                  >
                    {labels[risk]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Live Feed Log
                </p>
                <p className="text-xs text-on-surface-variant">Événements reçus en temps réel</p>
              </div>
              <div className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-on-surface-variant">
                {snapshot.feed.length} événements
              </div>
            </div>

            <div className="space-y-3">
              {snapshot.feed.map((event) => {
                const priority = priorityLabel(event.priority);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      const matched = snapshot.tracks.find((track) => track.deviceId === event.deviceId);
                      if (matched) {
                        setSelectedTrackId(matched.id);
                      }
                    }}
                    className="w-full rounded-lg border border-white bg-white p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-on-surface">{event.type}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{event.message}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${priority.tone}`}>
                        {priority.text}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span>{event.beneficiary}</span>
                      <span>{formatClock(event.time)}</span>
                    </div>
                  </button>
                );
              })}

              {snapshot.feed.length === 0 && (
                <div className="rounded-lg border border-dashed border-outline-variant bg-white/70 p-4 text-sm text-on-surface-variant">
                  En attente des premiers événements MQTT ou WebSocket.
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="relative min-h-[70vh] overflow-hidden">
          <div className="absolute left-4 top-4 z-[800] flex flex-wrap gap-2">
              <div className="rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Wifi size={16} className={snapshot.connected ? "text-primary" : "text-error-container"} />
                  <span>{snapshot.connected ? "Connecté" : "Déconnecté"}</span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Source: {snapshot.source} · {snapshot.lastUpdated ? formatAgo(snapshot.lastUpdated) : "—"}
                </p>
              </div>
            </div>

          {selectedTrack && (
            <div className="absolute right-4 top-4 z-[950] w-[18rem]">
              {!showDetails ? (
                <div className="rounded-2xl bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Détenu sélectionné
                      </p>
                      <p className="mt-1 font-[Manrope] text-lg font-bold text-on-surface">{selectedTrack.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{selectedTrack.deviceId}</p>
                    </div>
                    <Badge variant={complianceLabel(selectedTrack.compliance).variant}>
                      {complianceLabel(selectedTrack.compliance).text}
                    </Badge>
                  </div>
                  {selectedAuthorizedZones.length > 0 && (
                    <div className="mt-3 rounded-lg bg-primary-fixed/20 border border-primary/30 p-2.5">
                      <p className="text-xs font-semibold text-primary">
                        ✓ {selectedAuthorizedZones.length} zone(s) sur la carte
                      </p>
                    </div>
                  )}
                  {selectedTrackZonesError && (
                    <div className="mt-3 rounded-lg border border-error-container/40 bg-error-container/20 p-2.5">
                      <p className="text-xs font-semibold text-on-error-container">
                        Zones indisponibles: {selectedTrackZonesError}
                      </p>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-on-surface-variant">
                    {selectedAuthorizedZones.length > 0
                      ? `Zones autorisées affichées sur la carte (surligné en turquoise). Cliquer pour plus de détails.`
                      : `Zones autorisées: ${selectedAuthorizedZones.length}. Clique sur le bouton pour ouvrir la carte de détail.`}
                  </p>
                  <div className="mt-2 rounded-lg bg-surface-low px-3 py-2 text-[10px] text-on-surface-variant">
                    <p>ID bénéficiaire: {selectedTrack.id}</p>
                    <p>Zones brutes reçues: {selectedTrackZonesRawCount ?? "—"}</p>
                    <p>Zones autorisées affichables: {selectedAuthorizedZones.length}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDetails(true)}
                      className="flex-1 rounded-lg bg-gradient-to-br from-primary to-primary-container px-3 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-sm"
                    >
                      Voir les détails
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTrackId(null)}
                      className="rounded-lg px-3 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-high"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/96 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Carte de détail
                      </p>
                      <p className="mt-1 font-[Manrope] text-xl font-bold text-on-surface">{selectedTrack.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{selectedTrack.deviceId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDetails(false)}
                      className="rounded-full px-2 py-1 text-xs font-bold text-on-surface-variant transition hover:bg-surface-high"
                    >
                      Fermer
                    </button>
                  </div>

                  {/* Zones authorized notice */}
                  {selectedAuthorizedZones.length > 0 && (
                    <div className="mt-4 rounded-lg bg-primary-fixed/20 border border-primary/30 p-3">
                      <p className="text-xs font-semibold text-primary">
                        ✓ {selectedAuthorizedZones.length} zone(s) autorisée(s) affichée(s) sur la carte
                      </p>
                      <p className="mt-1 text-[10px] text-on-surface-variant">Zones surlignées en turquoise avec contour pointillé</p>
                    </div>
                  )}
                  {selectedTrackZonesError && (
                    <div className="mt-4 rounded-lg border border-error-container/40 bg-error-container/20 p-3">
                      <p className="text-xs font-semibold text-on-error-container">
                        Chargement des zones impossible: {selectedTrackZonesError}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-surface-low p-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Batterie
                      </p>
                      <p className={`mt-1 font-bold ${batteryTone(selectedTrack.batteryPct)}`}>{selectedTrack.batteryPct}%</p>
                    </div>
                    <div className="rounded-md bg-surface-low p-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Signal
                      </p>
                      <p className="mt-1 font-bold text-on-surface">{selectedTrack.signalDbm} dBm</p>
                    </div>
                    <div className="rounded-md bg-surface-low p-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Zone
                      </p>
                      <p className="mt-1 font-bold text-on-surface">
                        {selectedTrack.zoneStatus === "OUTSIDE"
                          ? "Hors zone autorisée"
                          : selectedTrack.zoneLabel
                            ? `Dans la zone ${selectedTrack.zoneLabel}`
                            : "Zone autorisée"}
                      </p>
                    </div>
                    <div className="rounded-md bg-surface-low p-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Position
                      </p>
                      <p className="mt-1 font-mono text-[11px] font-bold text-on-surface">
                        {selectedTrack.latitude.toFixed(5)}, {selectedTrack.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <MapContainer
            center={mapCenter}
            zoom={12}
            className="h-[calc(100vh-4rem)] w-full"
            zoomControl={false}
            scrollWheelZoom
          >
            <MainMap tracks={filteredTracks} />
            <SelectedTrackFocus track={selectedTrack} zones={selectedAuthorizedZones} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {selectedAuthorizedZones.map((zone) =>
              zone.polygons.map((polygon, polygonIndex) => (
                <React.Fragment key={`${zone.id}-${polygonIndex}`}>
                  {/* Shadow/glow layer */}
                  <Polygon
                    positions={offsetPolygon(polygon, -0.0012, 0.0012)}
                    pathOptions={{
                      color: "#17362e",
                      fillColor: "#17362e",
                      fillOpacity: 0.12,
                      weight: 0.5,
                      opacity: 0.2,
                    }}
                  />
                  {/* Main zone polygon */}
                  <Polygon
                    positions={polygon}
                    pathOptions={{
                      color: "#17362e",
                      fillColor: "#b8e6db",
                      fillOpacity: 0.28,
                      weight: 2.5,
                      opacity: 0.85,
                      dashArray: "5, 5",
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold text-on-surface">{zone.name}</p>
                        <p className="text-sm text-on-surface-variant">Zone autorisée</p>
                        <p className="text-xs text-on-surface-variant mt-2">{zone.type === "AUTORISEE" ? "✓ Autorisée" : "✗ Interdite"}</p>
                      </div>
                    </Popup>
                  </Polygon>
                </React.Fragment>
              )),
            )}

            {filteredTracks.map((track) => (
              <Marker
                key={track.id}
                position={[track.latitude, track.longitude]}
                icon={createMarkerIcon(track)}
                eventHandlers={{
                  click: () => setSelectedTrackId(track.id),
                }}
              >
                <Popup>
                  <div className="min-w-56 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-on-surface">{track.name}</p>
                        <p className="text-xs text-on-surface-variant">{track.deviceId}</p>
                      </div>
                      <Badge variant={complianceLabel(track.compliance).variant}>
                        {complianceLabel(track.compliance).text}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-surface-low p-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Batterie
                        </p>
                        <p className={`mt-1 font-bold ${batteryTone(track.batteryPct)}`}>{track.batteryPct}%</p>
                      </div>
                      <div className="rounded-md bg-surface-low p-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Signal
                        </p>
                        <p className="mt-1 font-bold text-on-surface">{track.signalDbm} dBm</p>
                      </div>
                      <div className="rounded-md bg-surface-low p-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Zone
                        </p>
                        <p className="mt-1 font-bold text-on-surface">
                          {track.zoneStatus === "OUTSIDE"
                            ? "Hors zone autorisée"
                            : track.zoneLabel
                              ? `Dans la zone ${track.zoneLabel}`
                              : "Zone autorisée"}
                        </p>
                      </div>
                      <div className="rounded-md bg-surface-low p-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Position
                        </p>
                        <p className="mt-1 font-mono text-[11px] font-bold text-on-surface">
                          {track.latitude.toFixed(5)}, {track.longitude.toFixed(5)}
                        </p>
                      </div>
                      <div className="rounded-md bg-surface-low p-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Ping
                        </p>
                        <p className="mt-1 font-bold text-on-surface">{formatAgo(track.lastPing)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrackId(track.id);
                          setShowDetails(false);
                        }}
                        className="flex-1 rounded-md bg-gradient-to-br from-primary to-primary-container px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                      >
                        Voir les détails
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTrackId(null)}
                        className="rounded-md px-3 py-2 text-[10px] font-semibold text-on-surface-variant transition hover:bg-surface-high"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          </MapContainer>
        </section>
      </div>
    </div>
  );
}
