import { Request, Response } from "express";
import Builder from "@/builder";
import type { BuildInputs } from "@/builder";
import { BuilderError } from "@/builder/errors";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import * as fs from "fs";
import fetch from "node-fetch";
import "zod-openapi/extend";

const gitTargetSchema = (service: string) =>
  z.string({ message: `Must be valid ${service} flake input uri` }).openapi({
    description: `The ${service} flake input uri to build`,
    example:
      service === "github"
        ? `${service}:Cliquers/text-file-build`
        : `${service}:owner/repo`,
  });

const buildControllerQuerySchema = z
  .object({
    target: z
      .union([
        gitTargetSchema("github"),
        gitTargetSchema("gitlab"),
        gitTargetSchema("bitbucket"),
      ])
      .openapi({
        description: "The target flake URI to build",
        example: "github:Cliquers/text-file-build",
      }),
    output: z
      .string()
      .regex(/^[a-zA-Z_][a-zA-Z0-9_'\.-]*$/)
      .default("default")
      .openapi({
        description: "The function to target from the flake.",
        example: "file",
      }),
  })
  .openapi({
    description: "Query parameters for the build endpoint",
  });

const primitiveSchema = z.union([z.string(), z.number(), z.boolean()]);
const buildInputsSchema = z.lazy(() =>
  z.record(
    z.string(),
    z.union([
      primitiveSchema,
      z.array(primitiveSchema),
      z.record(z.string(), primitiveSchema),
    ]),
  ),
);

const buildControllerBodySchema = z.object({
  callback: z.string().url(),
  inputs: buildInputsSchema.default({}),
});

interface BuildControllerRequest extends Request {
  body: z.infer<typeof buildControllerBodySchema>;
}

const buildController = async (req: BuildControllerRequest, res: Response) => {
  console.log("Received build request", req.query, req.body);

  // Validaate request query params
  const zQueryParams = buildControllerQuerySchema.safeParse(req.query);
  if (!zQueryParams.success) {
    res.status(400).json({ errors: zQueryParams.error.errors });
    return;
  }

  // Start the build
  let cleanup = () => {};
  let builder = new Builder({
    target: zQueryParams.data!.target,
    output: zQueryParams.data!.output,
    callback: async (output: string) => {
      const fileStream = fs.createReadStream(output);
      const { size } = await fs.promises.stat(output);
      console.log("Sending build output to", req.body.callback);
      fetch(req.body.callback, {
        method: "POST",
        body: fileStream,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(size),
        },
      }).then((resp) => {
        console.log("Build output sent", resp.status);
        cleanup;
      });
    },
    inputs: req.body.inputs,
    options: {},
  });
  cleanup = () => {
    console.log("Cleaning up after build");
    builder.cleanup();
  };
  builder
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
  res.status(StatusCodes.ACCEPTED).json({ message: "Build started" });
  return;
};

export {
  buildController,
  buildControllerBodySchema,
  buildControllerQuerySchema,
};
