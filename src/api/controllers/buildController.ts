import { Request, Response } from "express";
import Builder from "@/builder";
import type { BuilderOptions, BuildInputs } from "@/builder";
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

const BuildInputsSchema: z.ZodType<BuildInputs> = z.lazy(() =>
  z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), BuildInputsSchema]),
  ),
);

const doBuildBodySchema = z.object({
  callback: z.string().url(),
  inputs: BuildInputsSchema.default({}),
});

export const doBuild = async (req: Request, res: Response) => {
  console.log("Received build request", req.query, req.body);

  // Validaate request query params
  const zQueryParams = doBuildQueryParamSchema.safeParse(req.query);
  if (!zQueryParams.success) {
    res.status(400).json({ errors: zQueryParams.error.errors });
    return;
  }

  // Validate request body
  const zBody = doBuildBodySchema.safeParse(req.body);
  if (!zBody.success) {
    res.status(400).json({ errors: zBody.error.errors });
    return;
  }

  // Start the build
  new Builder({
    target: zQueryParams.data!.target,
    output: zQueryParams.data!.output,
    callback: (output) => {
      console.log(`Build completed! Located @ ${output}.`);
    },
    inputs: zBody.data.inputs,
    options: {},
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

  // Respond to the client with awk
  res.status(202).json({ message: "Build started" });
  return;
};
