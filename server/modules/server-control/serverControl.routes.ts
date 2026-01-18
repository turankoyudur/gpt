import { Router } from "express";
import { ServerControlService } from "./serverControl.service";

export const serverControlRouter = Router();
const svc = new ServerControlService();

serverControlRouter.get("/status", async (_req, res) => {
  res.json(await svc.status());
});

serverControlRouter.post("/start", async (_req, res) => {
  res.json(await svc.start());
});

serverControlRouter.post("/stop", async (_req, res) => {
  res.json(await svc.stop());
});

serverControlRouter.post("/restart", async (_req, res) => {
  res.json(await svc.restart());
});