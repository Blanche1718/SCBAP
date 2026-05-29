"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const dotenvPath = process.env.DOTENV_CONFIG_PATH
    ? path_1.default.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
    : path_1.default.resolve(process.cwd(), process.env.NODE_ENV === "production" ? ".env.production" : ".env");
dotenv_1.default.config({ path: dotenvPath });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL est manquant dans l'environnement");
}
// Configure adapter with improved connection handling
const adapter = new adapter_pg_1.PrismaPg({
    connectionString,
});
const prisma = new client_1.PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? [] : ["query", "error", "warn"],
});
exports.default = prisma;
