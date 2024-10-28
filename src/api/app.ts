import router from "@api/routes";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { loggerMiddleware } from "@api/middlewares/loggerMiddleware";

const app = express();
app.use(loggerMiddleware);
app.use(bodyParser.json());
app.use(cors());

app.use("/", router);

export default app;
