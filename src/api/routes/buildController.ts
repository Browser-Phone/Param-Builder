import { Request, Response } from "express";
import { z } from "zod";

const gitTargetSchema = (service: string) =>
  z
    .string({ message: `Must be valid ${service} flake input uri` })
    .regex(new RegExp(`^${service}:[\\w.-]+/[\\w.-]+(/[\\w.-]+)?$`));

const doBuildQueryParamSchema = z.object({
  target: z.union([
    gitTargetSchema("github"),
    gitTargetSchema("gitlab"),
    gitTargetSchema("bitbucket"),
  ]),
  output: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_'-]*$/),
});

const doBuildBodySchema = z.object({
  callback: z.string().url(),
});

export const doBuild = (req: Request, res: Response) => {
  let validation;

  validation = doBuildQueryParamSchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.errors });
  }

  validation = doBuildBodySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.errors });
  }

  res.status(201).send();
};
