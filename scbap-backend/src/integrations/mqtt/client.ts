import mqtt from "mqtt";
import {
  MQTT_BROKER_URL,
  MQTT_CLIENT_ID,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TELEMETRY_TOPIC,
  MQTT_EVENTS_TOPIC,
  MQTT_STATUS_TOPIC,
  MQTT_CONFIG_TOPIC,
  MQTT_DEBUG,
} from "./config";

type MqttMessageHandler = (topic: string, payload: Buffer) => Promise<void> | void;

let client: mqtt.MqttClient | null = null;
let started = false;

function logDebug(...args: unknown[]) {
  if (MQTT_DEBUG) {
    console.log("[mqtt]", ...args);
  }
}

export function startMqttSubscriber(onMessage: MqttMessageHandler) {
  if (started) {
    return;
  }

  started = true;

  const authOptions =
    MQTT_USERNAME || MQTT_PASSWORD
      ? {
          username: MQTT_USERNAME || undefined,
          password: MQTT_PASSWORD || undefined,
        }
      : {};

  client = mqtt.connect(MQTT_BROKER_URL, {
    clientId: MQTT_CLIENT_ID,
    reconnectPeriod: 5000,
    connectTimeout: 10_000,
    ...authOptions,
  });

  client.on("connect", () => {
    logDebug("connected", MQTT_BROKER_URL);

    const topics = [
      MQTT_TELEMETRY_TOPIC,
      MQTT_EVENTS_TOPIC,
      MQTT_STATUS_TOPIC,
      MQTT_CONFIG_TOPIC,
    ];

    client?.subscribe(topics, { qos: 1 }, (error) => {
      if (error) {
        console.error("[mqtt] subscribe error", error.message);
        return;
      }

      logDebug("subscribed", topics);
    });
  });

  client.on("message", async (topic, payload) => {
    try {
      await onMessage(topic, payload);
    } catch (error) {
      console.error("[mqtt] message handler error", error);
    }
  });

  client.on("error", (error) => {
    console.error("[mqtt] error", error.message);
  });

  client.on("reconnect", () => {
    logDebug("reconnect");
  });

  client.on("close", () => {
    logDebug("close");
  });
}

export function stopMqttSubscriber() {
  if (client) {
    client.end(true);
    client = null;
  }

  started = false;
}
