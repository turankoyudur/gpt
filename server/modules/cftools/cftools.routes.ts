import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { CFToolsService } from "./cftools.service";

export const cftoolsRouter = Router();
const svc = new CFToolsService();

cftoolsRouter.get("/config", async (_req, res) => {
  res.json(await svc.config());
});

cftoolsRouter.get("/priority-queue", async (req, res) => {
  const schema = z.object({ steamId64: z.string().min(17).max(20) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "steamId64 is required" });
  }
  res.json(await svc.getPriorityQueue(parsed.data.steamId64));
});

/**
 * Placeholder route for future: expose more GameLabs/CFTools features
 * (players list, bans, logs, economy, heatmap, etc.).
 */
cftoolsRouter.get("/todo", (_req, res) => {
  res.json({
    message:
      "Add more endpoints here based on the cftools-sdk API reference. This project is structured to make that easy.",
  });
});
