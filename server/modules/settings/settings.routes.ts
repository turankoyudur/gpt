import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService, instanceSettingsSchema } from "./settings.service";
import { getPrisma } from "../../db/prisma";

/**
 * /api/settings
 */
export const settingsRouter = Router();

function svc() {
  return new SettingsService(getPrisma());
}

settingsRouter.get("/", async (_req, res) => {
  const settings = await svc().get();
  res.json(settings);
});

settingsRouter.put("/", async (req, res) => {
  // Validate partial patch. Zod's .partial() ensures only known keys are accepted.
  const patchSchema = instanceSettingsSchema.partial();
  const patch = patchSchema.safeParse(req.body);
  if (!patch.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid settings payload",
      context: { issues: patch.error.issues },
    });
  }

  const updated = await svc().update(patch.data);
  res.json(updated);
});

settingsRouter.get("/validate", async (_req, res) => {
  const results = await svc().validatePaths();
  res.json(results);
});

settingsRouter.post("/reset", async (_req, res) => {
  // Resets to defaults by overwriting with defaults.
  const defaults = instanceSettingsSchema.parse({});
  const updated = await svc().update(defaults);
  res.json(updated);
});

// Simple helper endpoint to test request validation patterns used across the project
settingsRouter.post("/validate-example", (req, res) => {
  const schema = z.object({ foo: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "foo is required",
    });
  }
  res.json({ ok: true, foo: parsed.data.foo });
});
