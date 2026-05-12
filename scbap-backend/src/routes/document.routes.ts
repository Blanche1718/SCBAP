import { Router } from "express";
import { deleteDocumentController, downloadDocumentController } from "../controllers/document.controller";

const documentRouter = Router();

documentRouter.get("/:documentId/download", downloadDocumentController);
documentRouter.delete("/:documentId", deleteDocumentController);

export default documentRouter;
