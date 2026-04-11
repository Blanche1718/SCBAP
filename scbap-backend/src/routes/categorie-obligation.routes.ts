import { Router } from "express";
import {
  createCategorieObligationController,
  deleteCategorieObligationController,
  getCategorieObligationByIdController,
  getCategoriesObligationController,
  updateCategorieObligationController,
} from "../controllers/categorie-obligation.controller";

const categorieObligationRouter = Router();

categorieObligationRouter.get("/", getCategoriesObligationController);
categorieObligationRouter.get("/:id", getCategorieObligationByIdController);
categorieObligationRouter.post("/", createCategorieObligationController);
categorieObligationRouter.put("/:id", updateCategorieObligationController);
categorieObligationRouter.delete("/:id", deleteCategorieObligationController);

export default categorieObligationRouter;
