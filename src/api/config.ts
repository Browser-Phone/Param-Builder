import { createConfig } from "express-zod-api";
import { Documentation } from "express-zod-api";
import routing from "@api/routes";
import ui from "swagger-ui-express";

export const config = createConfig({
  server: {
    listen: 8000,
  },
  cors: true,
  logger: { level: "debug", color: true },
});

export const docs = new Documentation({
  routing,
  config,
  version: "1.0.0",
  title: "Cliquer API",
  serverUrl: "https://cliquer.cliquets.io",
  composition: "inline",
});

config.server.beforeRouting = ({ app }) => {
  app.get("/docs.yaml", (req, res) => {
    res.type("text/yaml").send(docs.getSpecAsYaml());
  });
  app.use("/docs", ui.serve, ui.setup(JSON.parse(docs.getSpecAsJson())));
};

export default config;
