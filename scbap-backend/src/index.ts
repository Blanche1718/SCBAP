import "dotenv/config";
import express from "express";
import cors from "cors";
import categorieObligationRouter from "./routes/categorie-obligation.routes";
import dossierRouter from "./routes/dossier.routes";
import { errorHandler } from "./errorHandler";
import obligationRouter from "./routes/obligation.routes";
import beneficiaireRouter from "./routes/beneficiaire.routes";
import documentRouter from "./routes/document.routes";
import pointageRouter from "./routes/pointage.routes";
import dapgImportRouter from "./routes/dapg-import.routes";
import dashboardRouter from "./routes/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/categories-obligations", categorieObligationRouter);
app.use("/dossiers", dossierRouter);
app.use("/obligations", obligationRouter);
app.use("/beneficiaires", beneficiaireRouter);
app.use("/documents", documentRouter);
app.use("/pointages", pointageRouter);
app.use("/dapg-import", dapgImportRouter);
app.use("/dashboard", dashboardRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`SCBAP backend running on port ${port}`);
});

export default app;
