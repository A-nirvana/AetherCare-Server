import { Router } from "express";
import { predictCondition } from "@/controllers/ml.controller";

const router = Router();

router.post("/predict", predictCondition);

export default router;
