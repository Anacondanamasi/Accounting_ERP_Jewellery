import type { Response } from "express";

export const ok = <T>(res: Response, data: T, message?: string) =>
  res.status(200).json({ success: true, data, message });

export const created = <T>(res: Response, data: T, message?: string) =>
  res.status(201).json({ success: true, data, message });

export const fail = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) => res.status(status).json({ success: false, error: { code, message, details } });
