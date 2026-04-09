import "dotenv/config";
import express from "express";
import dossierRouter from "./routes/dossier.routes";
import { errorHandler } from "./errorHandler";

const app = express();

app.use(express.json());
app.use("/dossiers", dossierRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`SCBAP backend running on port ${port}`);
});

export default app;
