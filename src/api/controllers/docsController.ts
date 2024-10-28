import { Request, Response } from "express";
import document from "@api/openapi";

const docsController = (req: Request, res: Response) => {
  res.json(document);
};

export { document, docsController };
