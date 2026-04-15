import { Router } from "express";
import { downloadDocumentController } from "../controllers/document.controller";

const documentRouter = Router();

documentRouter.get("/:documentId/download", downloadDocumentController);

export default documentRouter;
