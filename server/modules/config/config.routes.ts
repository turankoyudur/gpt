import { Router } from "express";
import { z } from "zod";
import { ConfigService } from "./config.service";

export const configRouter = Router();
const svc = new ConfigService();

/**
 * List editable files (for UI tabs).
 */
configRouter.get("/files", async (_req, res) => {
  const files = await svc.listEditableFiles();
  res.json({ files });
});

/**
 * Read server config raw text.
 */
configRouter.get("/servercfg", async (_req, res) => {
  const raw = await svc.readServerCfgRaw();
  res.json({ raw });
});

/**
 * Write server config raw text.
 */
configRouter.put("/servercfg", async (req, res) => {
  const bodySchema = z.object({ raw: z.string() });
  const body = bodySchema.parse(req.body ?? {});
  const result = await svc.writeServerCfgRaw(body.raw);
  res.json(result);
});
