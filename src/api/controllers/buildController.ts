import { Request, Response } from "express";
import Builder from "@/builder";
import type { BuilderOptions } from "@/builder";
import {
  BuilderLocateError,
  BuilderTimeoutError,
  BuilderError,
} from "@/builder/errors";
import { z } from "zod";

const DRY_RUN_TIMEOUT = 1000;

const gitTargetSchema = (service: string) =>
  z.string({ message: `Must be valid ${service} flake input uri` });

const doBuildQueryParamSchema = z.object({
  target: z.union([
    gitTargetSchema("github"),
    gitTargetSchema("gitlab"),
    gitTargetSchema("bitbucket"),
  ]),
  output: z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_'\.-]*$/)
    .default("default"),
});

const doBuildBodySchema = z.object({
  callback: z.string().url(),
});

export const doBuild = async (req: Request, res: Response) => {
  console.log("Received build request", req.query, req.body);
  const zQueryParams = doBuildQueryParamSchema.safeParse(req.query);
  if (!zQueryParams.success) {
    res.status(400).json({ errors: zQueryParams.error.errors });
    return;
  }

  const zBody = doBuildBodySchema.safeParse(req.body);
  if (!zBody.success) {
    res.status(400).json({ errors: zBody.error.errors });
    return;
  }

  const mkBuilder = (
    callback: (output: string) => void,
    options: Partial<BuilderOptions> = {},
  ) =>
    new Builder(
      zQueryParams.data!.target,
      zQueryParams.data!.output,
      callback,
      options,
    );

  // Run a dry run before responding to make sure build will be possible
  let dryRunPass = true;
  await mkBuilder(() => {}, {
    timeout: DRY_RUN_TIMEOUT,
    nixArgs: ["--dry-run"],
  })
    .build()
    .catch((e: BuilderError) => {
      if (e instanceof BuilderLocateError) {
        res.status(404).json({ errors: [e.message] });
        dryRunPass = false;
      }
      if (e instanceof BuilderError && !(e instanceof BuilderTimeoutError)) {
        res.status(500).json({ errors: [e.message] });
        dryRunPass = false;
      }
    });

  if (!dryRunPass) {
    return;
  }

  // Start the build in the background and return 201 (successfully started)
  mkBuilder((output) => {
    console.log(`Build completed! Located @ ${output}.`);
  })
    .build()
    .then(() => {
      console.log(
        `Build of ${zQueryParams.data!.target}#${zQueryParams.data!.output} complete`,
      );
    })
    .catch((e: BuilderError) => {
      console.error(
        `Build of ${zQueryParams.data!.target}#${zQueryParams.data!.output} failed: ${e}`,
      );
    });
  res.status(202).json({ message: "Build started" });
  return;
};
