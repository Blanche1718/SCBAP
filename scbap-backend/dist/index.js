"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const categorie_obligation_routes_1 = __importDefault(require("./routes/categorie-obligation.routes"));
const dossier_routes_1 = __importDefault(require("./routes/dossier.routes"));
const errorHandler_1 = require("./errorHandler");
const auth_middleware_1 = require("./auth/auth.middleware");
const obligation_routes_1 = __importDefault(require("./routes/obligation.routes"));
const beneficiaire_routes_1 = __importDefault(require("./routes/beneficiaire.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const pointage_routes_1 = __importDefault(require("./routes/pointage.routes"));
const dapg_import_routes_1 = __importDefault(require("./routes/dapg-import.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const juridiction_routes_1 = __importDefault(require("./routes/juridiction.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const biometrie_routes_1 = __importDefault(require("./routes/biometrie.routes"));
const alertes_routes_1 = __importDefault(require("./routes/alertes.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const service_externe_routes_1 = __importDefault(require("./routes/service-externe.routes"));
const portail_routes_1 = __importDefault(require("./routes/portail.routes"));
const rapport_routes_1 = __importDefault(require("./routes/rapport.routes"));
const biometrie_scheduler_1 = require("./jobs/biometrie.scheduler");
const client_1 = require("./integrations/mqtt/client");
const mqtt_service_1 = require("./services/mqtt.service");
const webhooks_routes_1 = __importDefault(require("./routes/webhooks.routes"));
const surveillance_realtime_service_1 = require("./services/surveillance-realtime.service");
const absence_check_job_1 = require("./jobs/absence-check.job");
const monthly_rapport_job_1 = require("./jobs/monthly-rapport.job");
const surveillance_health_job_1 = require("./jobs/surveillance-health.job");
const request_logger_1 = require("./middleware/request-logger");
const logger_1 = require("./logger");
const dotenvPath = process.env.DOTENV_CONFIG_PATH
    ? path_1.default.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
    : path_1.default.resolve(process.cwd(), ".env");
dotenv_1.default.config({ path: dotenvPath });
const nodeEnv = process.env.NODE_ENV || "development";
process.env.NODE_ENV = nodeEnv;
if (!process.env.DOTENV_CONFIG_PATH) {
    dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), `.env.${nodeEnv}`), override: true });
}
(0, env_1.validateEnv)();
const app = (0, express_1.default)();
const allowedOrigins = (0, env_1.getAllowedOrigins)();
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Webhook-Signature", "X-Webhook-Timestamp"],
}));
app.use(express_1.default.json());
app.use(request_logger_1.requestLogger);
app.use("/auth", auth_routes_1.default);
app.use("/portail", portail_routes_1.default);
app.use("/webhooks", webhooks_routes_1.default);
app.get("/", (_req, res) => {
    res.json({
        name: "SCBAP backend",
        status: "ok",
    });
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use(auth_middleware_1.requireAuth);
app.use("/categories-obligations", categorie_obligation_routes_1.default);
app.use("/dossiers", dossier_routes_1.default);
app.use("/obligations", obligation_routes_1.default);
app.use("/beneficiaires", beneficiaire_routes_1.default);
app.use("/documents", document_routes_1.default);
app.use("/pointages", pointage_routes_1.default);
app.use("/dapg-import", dapg_import_routes_1.default);
app.use("/dashboard", dashboard_routes_1.default);
app.use("/juridictions", juridiction_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/biometrie", biometrie_routes_1.default);
app.use("/alertes", alertes_routes_1.default);
app.use("/notifications", notification_routes_1.default);
app.use("/services-externes", service_externe_routes_1.default);
app.use("/rapports", rapport_routes_1.default);
app.use(errorHandler_1.errorHandler);
const port = Number(process.env.PORT) || 3000;
const server = (0, http_1.createServer)(app);
(0, surveillance_realtime_service_1.initializeSurveillanceRealtime)(server);
server.listen(port, () => {
    logger_1.logger.info("SCBAP backend started", { port });
    (0, biometrie_scheduler_1.startBiometrieScheduler)();
    (0, client_1.startMqttSubscriber)(mqtt_service_1.handleMqttMessage);
    (0, absence_check_job_1.initializeAbsenceCheckJob)();
    (0, monthly_rapport_job_1.initializeMonthlyRapportJob)();
    (0, surveillance_health_job_1.initializeSurveillanceHealthJob)();
});
exports.default = app;
