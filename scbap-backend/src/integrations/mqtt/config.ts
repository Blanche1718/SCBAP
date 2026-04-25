import "dotenv/config";

export const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL?.trim() || "mqtt://localhost:1883";
export const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID?.trim() || "scbap-backend-dev";
export const MQTT_USERNAME = process.env.MQTT_USERNAME?.trim() || "";
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD?.trim() || "";
export const MQTT_TELEMETRY_TOPIC = process.env.MQTT_TELEMETRY_TOPIC?.trim() || "scbap/bracelets/telemetry";
export const MQTT_EVENTS_TOPIC = process.env.MQTT_EVENTS_TOPIC?.trim() || "scbap/bracelets/events";
export const MQTT_STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC?.trim() || "scbap/bracelets/status";
export const MQTT_CONFIG_TOPIC = process.env.MQTT_CONFIG_TOPIC?.trim() || "scbap/bracelets/config";
export const MQTT_DEBUG = process.env.MQTT_DEBUG === "true";

