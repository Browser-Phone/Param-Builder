import yargs from "yargs";
import router from "@api/routes";
import { hideBin } from "yargs/helpers";
import { getNixSystem } from "./utils";
import { createServer } from "express-zod-api";
import config from "@api/config";
process.env.NIX_SYSTEM = await getNixSystem();

interface ArgvType {
  port: number;
  [x: string]: unknown;
}

const argv = yargs(hideBin(process.argv))
  .option("port", {
    alias: "p",
    description: "Port to run the server on",
    type: "number",
    default: 8000,
  })
  .alias("help", "h")
  .showHelpOnFail(false)
  .parseSync() as ArgvType;

config.server.listen = argv.port;
createServer(config, router);
