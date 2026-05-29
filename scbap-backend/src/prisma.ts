import dotenv from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Load appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath, override: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL est manquant dans l'environnement");
}

// Configure adapter with improved connection handling
const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "production" ? [] : ["query", "error", "warn"],
});

export default prisma;
