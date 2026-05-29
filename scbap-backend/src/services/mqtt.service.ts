import {
  MQTT_CONFIG_TOPIC,
  MQTT_EVENTS_TOPIC,
  MQTT_STATUS_TOPIC,
  MQTT_TELEMETRY_TOPIC,
} from "../integrations/mqtt/config";
import { handleBraceletTelemetryMessage } from "./bracelet-telemetry.service";

export async function handleMqttMessage(topic: string, payload: Buffer) {
  switch (topic) {
    case MQTT_TELEMETRY_TOPIC:
      await handleBraceletTelemetryMessage(payload);
      return;

    case MQTT_EVENTS_TOPIC:
    case MQTT_STATUS_TOPIC:
    case MQTT_CONFIG_TOPIC:
      console.log(`[mqtt] topic non traite pour le moment: ${topic}`);
      return;

    default:
      console.log(`[mqtt] topic ignore: ${topic}`);
  }
}
