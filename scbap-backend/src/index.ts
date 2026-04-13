import "dotenv/config";
import express from "express";
import cors from "cors";
import categorieObligationRouter from "./routes/categorie-obligation.routes";
import dossierRouter from "./routes/dossier.routes";
import { errorHandler } from "./errorHandler";
import obligationRouter from "./routes/obligation.routes";
import beneficiaireRouter from "./routes/beneficiaire.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/categories-obligations", categorieObligationRouter);
app.use("/dossiers", dossierRouter);
app.use("/obligations", obligationRouter);
app.use("/beneficiaires", beneficiaireRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`SCBAP backend running on port ${port}`);
});

export default app;
