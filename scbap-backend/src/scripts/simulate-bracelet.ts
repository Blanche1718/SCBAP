import "dotenv/config";
import mqtt from "mqtt";
import prisma from "../prisma";
import {
  MQTT_BROKER_URL,
  MQTT_CLIENT_ID,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TELEMETRY_TOPIC,
  MQTT_DEBUG,
} from "../integrations/mqtt/config";

type SimulationMode = "normal" | "alert" | "zone" | "battery" | "strap" | "signal" | "tamper";
type SimulationTarget = {
  deviceId: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
};

const MODE = (process.env.BRACELET_SIMULATION_MODE || "normal").trim() as SimulationMode;
const DEVICE_ID = process.env.BRACELET_SIMULATION_DEVICE_ID?.trim() || "BR-SEED-001";
const DEVICE_IDS = (process.env.BRACELET_SIMULATION_DEVICE_IDS || DEVICE_ID)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const USER_ID = process.env.BRACELET_SIMULATION_USER_ID?.trim() || "";
const USER_NAME = process.env.BRACELET_SIMULATION_USER_NAME?.trim() || "";
const USER_LAT = Number(process.env.BRACELET_SIMULATION_LATITUDE || "");
const USER_LNG = Number(process.env.BRACELET_SIMULATION_LONGITUDE || "");
const INTERVAL_MS = Number(process.env.BRACELET_SIMULATION_INTERVAL_MS || "10000");
const DEFAULT_LAT = 6.3703;
const DEFAULT_LNG = 2.3912;

const authOptions =
  MQTT_USERNAME || MQTT_PASSWORD
    ? {
        username: MQTT_USERNAME || undefined,
        password: MQTT_PASSWORD || undefined,
      }
    : {};

let client: mqtt.MqttClient | null = null;
let simulationTargets: SimulationTarget[] = [{
  deviceId: DEVICE_ID,
  userId: USER_ID || "DET-UNKNOWN",
  userName: USER_NAME || "Beneficiaire Test",
  latitude: Number.isFinite(USER_LAT) ? USER_LAT : DEFAULT_LAT,
  longitude: Number.isFinite(USER_LNG) ? USER_LNG : DEFAULT_LNG,
}];

function logDebug(...args: unknown[]) {
  if (MQTT_DEBUG) {
    console.log("[bracelet-sim]", ...args);
  }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function isCoordinate(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function resolveCentroidFromGeometry(geometry: unknown): { latitude: number; longitude: number } | null {
  if (typeof geometry === "string") {
    try {
      return resolveCentroidFromGeometry(JSON.parse(geometry));
    } catch {
      return null;
    }
  }

  if (geometry && typeof geometry === "object" && !Array.isArray(geometry)) {
    const candidate = geometry as {
      type?: unknown;
      geometry?: unknown;
      coordinates?: unknown;
    };

    if (candidate.geometry) {
      return resolveCentroidFromGeometry(candidate.geometry);
    }

    if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
      const ring = candidate.coordinates[0];
      const points = Array.isArray(ring)
        ? ring
            .filter(isCoordinate)
            .map(([lng, lat]) => [lat, lng] as [number, number])
        : [];
      return resolveCentroidFromGeometry(points);
    }

    if (candidate.coordinates) {
      return resolveCentroidFromGeometry(candidate.coordinates);
    }

    return null;
  }

  if (!Array.isArray(geometry) || geometry.length === 0) {
    return null;
  }

  const first = geometry[0];
  let points: [number, number][] = [];

  if (isCoordinate(first)) {
    points = geometry.filter(isCoordinate) as [number, number][];
  } else if (Array.isArray(first) && first.length > 0 && isCoordinate(first[0])) {
    points = first.filter(isCoordinate) as [number, number][];
  }

  if (!points.length) {
    return null;
  }

  const { latSum, lngSum } = points.reduce(
    (acc, [lat, lng]) => ({
      latSum: acc.latSum + lat,
      lngSum: acc.lngSum + lng,
    }),
    { latSum: 0, lngSum: 0 },
  );

  return {
    latitude: latSum / points.length,
    longitude: lngSum / points.length,
  };
}

async function resolveSimulationTarget(deviceId: string): Promise<SimulationTarget> {
  const bracelet = await prisma.bracelet.findUnique({
    where: {
      codeImei: deviceId,
    },
    include: {
      affectations: {
        where: {
          dateFin: null,
        },
        orderBy: {
          dateDebut: "desc",
        },
        take: 1,
        include: {
          beneficiaire: {
            include: {
              dossier: true,
              zones: {
                orderBy: [{ type: "asc" }, { nom: "asc" }],
              },
              positionsGPS: {
                orderBy: {
                  dateHeure: "desc",
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!bracelet) {
    console.warn(
      `[bracelet-sim] bracelet "${deviceId}" introuvable en base, utilisation des valeurs .env`,
    );
    return {
      ...simulationTargets[0],
      deviceId,
    };
  }

  const affectation = bracelet.affectations[0] ?? null;
  if (!affectation) {
    console.warn(
      `[bracelet-sim] bracelet "${deviceId}" sans affectation active, utilisation des valeurs .env`,
    );
    return {
      ...simulationTargets[0],
      deviceId: bracelet.codeImei,
      userId: USER_ID || bracelet.identifiantPorteur || simulationTargets[0].userId,
    };
  }

  const beneficiaire = affectation.beneficiaire;
  const dossier = beneficiaire.dossier;
  const latestPosition = beneficiaire.positionsGPS[0] ?? null;
  const firstAuthorizedZone = beneficiaire.zones.find((zone) => zone.type === "AUTORISEE") ?? null;
  const zoneCentroid = resolveCentroidFromGeometry(firstAuthorizedZone?.geometrie);
  const latitude = Number.isFinite(USER_LAT)
    ? USER_LAT
    : latestPosition
      ? Number(latestPosition.latitude)
      : zoneCentroid?.latitude ?? DEFAULT_LAT;
  const longitude = Number.isFinite(USER_LNG)
    ? USER_LNG
    : latestPosition
      ? Number(latestPosition.longitude)
      : zoneCentroid?.longitude ?? DEFAULT_LNG;

  return {
    deviceId: bracelet.codeImei,
    userId: USER_ID || bracelet.identifiantPorteur || dossier.numeroDossier || simulationTargets[0].userId,
    userName:
      USER_NAME ||
      [dossier.prenom, dossier.nom].filter(Boolean).join(" ").trim() ||
      simulationTargets[0].userName,
    latitude,
    longitude,
  };
}

function buildTelemetry(simulationTarget: SimulationTarget, targetIndex = 0) {
  const now = new Date();
  const alertMode = MODE === "alert";
  const zoneAlert = alertMode || MODE === "zone";
  const batteryAlert = alertMode || MODE === "battery";
  const strapAlert = alertMode || MODE === "strap";
  const signalAlert = alertMode || MODE === "signal";
  const tamperAlert = alertMode || MODE === "tamper";
  const drift = targetIndex * 0.004;
  const offsetLat = zoneAlert ? 0.02 + drift : randomBetween(-0.0015, 0.0015) + drift;
  const offsetLng = zoneAlert ? 0.02 + drift : randomBetween(-0.0015, 0.0015) + drift;
  const battery = batteryAlert ? randomBetween(8, 14) : randomBetween(48, 89);
  const geofenceBreach = zoneAlert;
  const zoneStatus = zoneAlert ? "OUTSIDE" : "INSIDE";
  const strapStatus = strapAlert ? 1 : 0;
  const gpsLost = signalAlert ? true : false;
  const gprsLost = signalAlert ? true : false;
  const caseTamper = tamperAlert;
  const status = geofenceBreach || strapStatus === 1 || caseTamper || signalAlert ? "ALERT" : "OK";

  return {
    device_id: simulationTarget.deviceId,
    user_id: simulationTarget.userId,
    user_name: simulationTarget.userName,
    timestamp: now.toISOString(),
    heartbeat: status === "OK",
    location: {
      latitude: Number((simulationTarget.latitude + offsetLat).toFixed(6)),
      longitude: Number((simulationTarget.longitude + offsetLng).toFixed(6)),
      accuracy: alertMode ? 28 : 12,
      presence_flag: !geofenceBreach,
      rssi_dbm: signalAlert ? -102 : -65,
      gps_fix: !gpsLost,
      zone_id: "HOME",
      zone_status: zoneStatus,
    },
    health: {
      battery_pct: Math.max(0, Math.min(100, Math.round(battery))),
      power_source: "battery",
      gprs_signal: signalAlert ? -108 : -84,
      gps_satellites: signalAlert ? 2 : 7,
    },
    alerts: {
      strap_status: strapStatus,
      geofence_breach: geofenceBreach,
      gps_lost: gpsLost,
      gprs_lost: gprsLost,
      case_tamper: caseTamper,
      power_loss: false,
    },
    status,
  };
}

function publishTelemetry() {
  if (!client) {
    return;
  }

  simulationTargets.forEach((target, index) => {
    const payload = buildTelemetry(target, index);
    const message = JSON.stringify(payload);
    const qos = payload.status === "OK" ? 0 : 1;

    client?.publish(MQTT_TELEMETRY_TOPIC, message, { qos }, (error) => {
      if (error) {
        console.error("[bracelet-sim] publish error", error.message);
        return;
      }

      console.log(`[bracelet-sim] published ${payload.device_id} (${MODE}, qos=${qos})`);
      logDebug(payload);
    });
  });
}

async function main() {
  simulationTargets = await Promise.all(DEVICE_IDS.map((deviceId) => resolveSimulationTarget(deviceId)));
  console.log("[bracelet-sim] targets", simulationTargets);

  client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `${MQTT_CLIENT_ID}-simulator`,
    reconnectPeriod: 5000,
    connectTimeout: 10_000,
    ...authOptions,
  });

  client.on("connect", () => {
    console.log(`[bracelet-sim] connected to ${MQTT_BROKER_URL}`);
    publishTelemetry();
    setInterval(publishTelemetry, INTERVAL_MS);
  });

  client.on("error", (error) => {
    console.error("[bracelet-sim] error", error.message);
  });

  client.on("reconnect", () => {
    logDebug("reconnect");
  });
}

void main().catch(async (error) => {
  console.error("[bracelet-sim] startup error", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("[bracelet-sim] stopping...");
  const done = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };

  if (!client) {
    void done();
    return;
  }

  client.end(true, () => {
    void done();
  });
});
