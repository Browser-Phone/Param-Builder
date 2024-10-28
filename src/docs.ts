import "zod-openapi/extend";
import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  buildControllerBodySchema,
  buildControllerQuerySchema,
} from "@api/controllers/buildController";

const MessageResp = {
  message: z.string().openapi({
    description: "A message",
    example: "Build started",
  }),
};

const document = createDocument({
  openapi: "3.0.0",
  info: {
    title: "Cliquer API",
    version: "1.0.0",
  },
  paths: {
    build: {
      post: {
        requestParams: {
          query: buildControllerQuerySchema,
        },
        requestBody: {
          content: {
            "application/json": { schema: buildControllerBodySchema },
          },
        },
        responses: {
          "200": {
            description: "202 Accepted",
            content: {
              "application/json": { schema: MessageResp },
            },
          },
        },
      },
    },
  },
});

export default document;
