import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { ModsService } from "./mods.service";

export const modsRouter = Router();
const svc = new ModsService();

modsRouter.get("/", async (_req, res) => {
  res.json(await svc.list());
});

modsRouter.post("/add", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/, "workshopId must be numeric") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid mod payload",
      context: { issues: parsed.error.issues },
    });
  }
  res.json(await svc.add(parsed.data.workshopId));
});

modsRouter.post("/install", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc.install(parsed.data.workshopId));
});

modsRouter.patch("/enable", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/), enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc.setEnabled(parsed.data.workshopId, parsed.data.enabled));
});

modsRouter.get("/scan", async (_req, res) => {
  res.json(await svc.scanInstalledOnDisk());
});

modsRouter.get("/search", async (req, res) => {
  const schema = z.object({ query: z.string().min(2) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid search query",
      context: { issues: parsed.error.issues },
    });
  }
  res.json(await svc.search(parsed.data.query));
});

modsRouter.post("/collection", async (req, res) => {
  const schema = z.object({ collectionId: z.string().regex(/^\d+$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc.importCollection(parsed.data.collectionId));
});

modsRouter.post("/refresh", async (_req, res) => {
  res.json(await svc.refreshMetadata());
});

modsRouter.post("/keys/sync", async (_req, res) => {
  res.json(await svc.syncKeys());
});
