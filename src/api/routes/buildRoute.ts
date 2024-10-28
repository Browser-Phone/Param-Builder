import express from "express";
import {
  buildController,
  buildControllerSchema,
} from "@api/controllers/buildController";
import { validateData } from "@api/middlewares/validationMiddleware";

const router = express.Router();

router.post("/", validateData(buildControllerSchema), buildController);

export default router;
