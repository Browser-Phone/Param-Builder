import Builder, { buildInputsSchema, buildStatusSchema } from "@/builder";
import { BuilderError } from "@/builder/errors";
import createHttpError from "http-errors";
import { z } from "zod";
import * as fs from "fs";
import fetch from "node-fetch";
import { defaultEndpointsFactory } from "express-zod-api";
import { v4 as uuid } from "uuid";
import { LRUCache } from "typescript-lru-cache";

const ongoingBuilds = new LRUCache<string, Builder>({
  maxSize: 1000,
  entryExpirationTimeInMS: 1000 * 60 * 60, // 1 hour
});

const gitTargetSchema = (service: string) =>
  z
    .string({ message: `Must be valid ${service} flake input uri` })
    .regex(new RegExp(`^${service}:[a-zA-Z0-9_/-]+$`))
    .example(`${service}:owner/repo`);

export const postBuilds = defaultEndpointsFactory.build({
  method: "post",
  input: z.object({
    target: z.union([
      gitTargetSchema("github"),
      gitTargetSchema("gitlab"),
      gitTargetSchema("bitbucket"),
    ]),
    output: z
      .string()
      .regex(/^[a-zA-Z_][a-zA-Z0-9_'\.-]*$/)
      .default("default")
      .example("default"),
    callback: z.string().url(),
    inputs: buildInputsSchema.default({}),
  }),
  output: z.object({
    buildId: z.string(),
  }),
  handler: async ({ input: { target, output, inputs, callback } }) => {
    console.log("Received build request", target, output);

    const buildId = uuid();

    let cleanup = () => {};
    let builder = new Builder({
      target,
      output,
      callback: async (output: string) => {
        const fileStream = fs.createReadStream(output);
        const { size } = await fs.promises.stat(output);

        console.log("Sending build output to", callback);
        fetch(callback, {
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
      inputs,
      options: {},
    });
    cleanup = () => {
      console.log("Cleaning up after build");
      builder.cleanup();
    };
    builder
      .build()
      .then(() => {
        console.log(`Build of ${target}#${output} complete`);
      })
      .catch((e: BuilderError) => {
        console.error(`Build of ${target}#${output} failed: ${e}`);
      });
    ongoingBuilds.set(buildId, builder);

    return { buildId };
  },
});

export const getBuilds = defaultEndpointsFactory.build({
  method: "get",
  input: z.object({
    buildId: z.string().uuid(),
  }),
  output: z.object({
    build: z.object({
      startedAt: z.string().optional(),
      buildInfo: z.object({
        status: buildStatusSchema,
      }),
    }),
  }),
  handler: async ({ input: { buildId } }) => {
    const builder = ongoingBuilds.get(buildId);
    if (!builder) {
      throw createHttpError(404, "Build not found");
    }

    const startedAt = builder?.startTime;
    const status = builder?.status || "pending";

    return {
      build: {
        startedAt: startedAt?.toISOString(),
        buildInfo: { status },
      },
    };
  },
});
