import express from "express";
import { doBuild } from "../routes/buildController.ts";

const router = express.Router();

router.post("/", doBuild);

export default router;
