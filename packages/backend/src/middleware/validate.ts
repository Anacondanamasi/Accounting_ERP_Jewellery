import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";

export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
