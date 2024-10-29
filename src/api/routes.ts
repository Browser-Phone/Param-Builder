import { Routing } from "express-zod-api";
import { getBuilds, postBuilds } from "@api/controllers/builds";

const router: Routing = {
  build: {
    "": postBuilds,
    ":buildId": getBuilds,
  },
};

export default router;
