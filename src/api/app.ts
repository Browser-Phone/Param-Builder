import buildRoute from "@api/routes/buildRoute";
import express from "express";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use("/build", buildRoute);

export default app;
