import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { RconService } from "./rcon.service";

export const rconRouter = Router();
const svc = new RconService();

rconRouter.get("/status", (_req, res) => {
  res.json(svc.status());
});

rconRouter.post("/connect", async (_req, res) => {
  res.json(await svc.connect());
});

rconRouter.post("/disconnect", async (_req, res) => {
  res.json(await svc.disconnect());
});

rconRouter.post("/command", async (req, res) => {
  const schema = z.object({ cmd: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "cmd is required" });
  }
  res.json(await svc.command(parsed.data.cmd));
});
