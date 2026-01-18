import { Router } from "express";
import { z } from "zod";
import { ConfigService } from "./config.service";
import { AppError, ErrorCodes } from "../../core/errors";

/**
 * /api/config
 */
export const configRouter = Router();
const svc = new ConfigService();

configRouter.get("/files", async (_req, res) => {
  res.json(await svc.listKnownConfigFiles());
});

configRouter.get("/battleye", async (_req, res) => {
  res.json(await svc.readBattlEyeCfgParsed());
});

configRouter.get("/battleye/raw", async (_req, res) => {
  res.json({ text: await svc.readBattlEyeCfgRaw() });
});

configRouter.put("/battleye/raw", async (req, res) => {
  const schema = z.object({ text: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid raw config payload",
      context: { issues: parsed.error.issues },
    });
  }
  await svc.writeBattlEyeCfgRaw(parsed.data.text);
  res.json({ ok: true });
});

configRouter.patch("/battleye", async (req, res) => {
  const schema = z.record(z.string(), z.string());
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid patch payload",
      context: { issues: parsed.error.issues },
    });
  }
  res.json(await svc.updateBattlEyeCfg(parsed.data));
});
