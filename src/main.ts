import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import app from "@api/app";

interface ArgvType {
  port: number;
  host: string;
  [x: string]: unknown;
}

const argv = yargs(hideBin(process.argv))
  .option("port", {
    alias: "p",
    description: "Port to run the server on",
    type: "number",
    default: 8000,
  })
  .option("host", {
    alias: "H",
    description: "Host to run the server on",
    type: "string",
    default: "localhost",
  })
  .alias("help", "h")
  .showHelpOnFail(false)
  .parseSync() as ArgvType;

const PORT = argv.port;
const HOST = argv.host;

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
