import { Router } from "express";
import { getJuridictionsController } from "../controllers/juridiction.controller";

const router = Router();

router.get("/", getJuridictionsController);

export default router;
