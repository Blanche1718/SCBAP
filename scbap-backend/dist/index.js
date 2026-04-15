"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const categorie_obligation_routes_1 = __importDefault(require("./routes/categorie-obligation.routes"));
const dossier_routes_1 = __importDefault(require("./routes/dossier.routes"));
const errorHandler_1 = require("./errorHandler");
const obligation_routes_1 = __importDefault(require("./routes/obligation.routes"));
const beneficiaire_routes_1 = __importDefault(require("./routes/beneficiaire.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const pointage_routes_1 = __importDefault(require("./routes/pointage.routes"));
const dapg_import_routes_1 = __importDefault(require("./routes/dapg-import.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/categories-obligations", categorie_obligation_routes_1.default);
app.use("/dossiers", dossier_routes_1.default);
app.use("/obligations", obligation_routes_1.default);
app.use("/beneficiaires", beneficiaire_routes_1.default);
app.use("/documents", document_routes_1.default);
app.use("/pointages", pointage_routes_1.default);
app.use("/dapg-import", dapg_import_routes_1.default);
app.use("/dashboard", dashboard_routes_1.default);
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use(errorHandler_1.errorHandler);
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`SCBAP backend running on port ${port}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map