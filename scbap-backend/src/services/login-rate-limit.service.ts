import { createClient } from "redis";
import { logger } from "../logger";

const REDIS_URL = process.env.REDIS_URL?.trim();
const REDIS_HOST = process.env.REDIS_HOST?.trim();
const REDIS_PORT = Number(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD?.trim();
const REDIS_DB = Number(process.env.REDIS_DB || "0");

const redisClient =
  REDIS_URL || REDIS_HOST
    ? createClient({
        url: REDIS_URL || `redis://${REDIS_HOST || "localhost"}:${REDIS_PORT}`,
        password: REDIS_PASSWORD || undefined,
        database: REDIS_DB,
      })
    : null;

let redisConnectPromise: Promise<void> | null = null;
let redisUnavailableLogged = false;

if (redisClient) {
  redisClient.on("error", (error) => {
    if (!redisUnavailableLogged) {
      redisUnavailableLogged = true;
      const log = process.env.NODE_ENV === "production" ? logger.warn : logger.debug;
      log("Redis rate limiter unavailable, using development memory fallback", {
        error,
      });
    }
  });
}

async function getRedisClient() {
  if (!redisClient) {
    return null;
  }

  if (!redisClient.isOpen) {
    redisConnectPromise ??= redisClient.connect().then(() => undefined);
    await redisConnectPromise;
  }

  return redisClient;
}

export async function getLoginFailureCount(key: string) {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const value = await client.get(key);
  return value ? Number(value) : 0;
}

export async function incrementLoginFailureCount(key: string, windowSeconds: number) {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const count = await client.incr(key);
  if (count === 1) {
    await client.expire(key, windowSeconds);
  }

  return count;
}

export async function clearLoginFailureCount(key: string) {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  await client.del(key);
  return true;
}
