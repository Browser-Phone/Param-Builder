import express from "express";
import { docsController } from "@api/controllers/docsController";
import {
  buildController,
  buildControllerBodySchema,
} from "@api/controllers/buildController";
import { validateData } from "@api/middlewares/validationMiddleware";
import swaggerUi from "swagger-ui-express";
import document from "@api/openapi";

const router = express.Router();

router.get("/docs.json", docsController);
router.use("/docs", swaggerUi.serve);
router.get("/docs", swaggerUi.setup(document));

router.post("/build", validateData(buildControllerBodySchema), buildController);

export default router;
