import express from "express";
import { doBuild } from "@api/controllers/buildController";

const router = express.Router();

router.post("/", doBuild);

export default router;
