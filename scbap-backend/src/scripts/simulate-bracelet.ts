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

type SimulationMode = "normal" | "alert";
type SimulationTarget = {
  deviceId: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
};

const MODE = (process.env.BRACELET_SIMULATION_MODE || "normal").trim() as SimulationMode;
const DEVICE_ID = process.env.BRACELET_SIMULATION_DEVICE_ID?.trim() || "BR-SEED-001";
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
let simulationTarget: SimulationTarget = {
  deviceId: DEVICE_ID,
  userId: USER_ID || "DET-UNKNOWN",
  userName: USER_NAME || "Beneficiaire Test",
  latitude: Number.isFinite(USER_LAT) ? USER_LAT : DEFAULT_LAT,
  longitude: Number.isFinite(USER_LNG) ? USER_LNG : DEFAULT_LNG,
};

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

async function resolveSimulationTarget(): Promise<SimulationTarget> {
  const bracelet = await prisma.bracelet.findUnique({
    where: {
      codeImei: DEVICE_ID,
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
      `[bracelet-sim] bracelet "${DEVICE_ID}" introuvable en base, utilisation des valeurs .env`,
    );
    return simulationTarget;
  }

  const affectation = bracelet.affectations[0] ?? null;
  if (!affectation) {
    console.warn(
      `[bracelet-sim] bracelet "${DEVICE_ID}" sans affectation active, utilisation des valeurs .env`,
    );
    return {
      ...simulationTarget,
      deviceId: bracelet.codeImei,
      userId: USER_ID || bracelet.identifiantPorteur || simulationTarget.userId,
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
    userId: USER_ID || bracelet.identifiantPorteur || dossier.numeroDossier || simulationTarget.userId,
    userName:
      USER_NAME ||
      [dossier.prenom, dossier.nom].filter(Boolean).join(" ").trim() ||
      simulationTarget.userName,
    latitude,
    longitude,
  };
}

function buildTelemetry() {
  const now = new Date();
  const alertMode = MODE === "alert";
  const offsetLat = alertMode ? 0.02 : randomBetween(-0.0015, 0.0015);
  const offsetLng = alertMode ? 0.02 : randomBetween(-0.0015, 0.0015);
  const battery = alertMode ? randomBetween(8, 14) : randomBetween(48, 89);
  const geofenceBreach = alertMode;
  const zoneStatus = alertMode ? "OUTSIDE" : "INSIDE";
  const strapStatus = alertMode ? 1 : 0;
  const gpsLost = alertMode ? Math.random() > 0.5 : false;
  const gprsLost = alertMode ? Math.random() > 0.6 : false;
  const caseTamper = alertMode ? Math.random() > 0.7 : false;

  return {
    device_id: simulationTarget.deviceId,
    user_id: simulationTarget.userId,
    user_name: simulationTarget.userName,
    timestamp: now.toISOString(),
    location: {
      latitude: Number((simulationTarget.latitude + offsetLat).toFixed(6)),
      longitude: Number((simulationTarget.longitude + offsetLng).toFixed(6)),
      accuracy: alertMode ? 28 : 12,
      zone_id: "HOME",
      zone_status: zoneStatus,
    },
    health: {
      battery_pct: Math.max(0, Math.min(100, Math.round(battery))),
      gprs_signal: alertMode ? -108 : -84,
      gps_satellites: alertMode ? 2 : 7,
    },
    alerts: {
      strap_status: strapStatus,
      geofence_breach: geofenceBreach,
      gps_lost: gpsLost,
      gprs_lost: gprsLost,
      case_tamper: caseTamper,
      power_loss: false,
    },
    status: geofenceBreach || strapStatus === 1 ? "ALERT" : "OK",
  };
}

function publishTelemetry() {
  const payload = buildTelemetry();
  const message = JSON.stringify(payload);

  if (!client) {
    return;
  }

  client.publish(MQTT_TELEMETRY_TOPIC, message, { qos: 1 }, (error) => {
    if (error) {
      console.error("[bracelet-sim] publish error", error.message);
      return;
    }

    console.log(`[bracelet-sim] published ${payload.device_id} (${MODE})`);
    logDebug(payload);
  });
}

async function main() {
  simulationTarget = await resolveSimulationTarget();
  console.log("[bracelet-sim] target", simulationTarget);

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
