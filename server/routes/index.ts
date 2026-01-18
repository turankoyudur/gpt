import { Router } from "express";
import { settingsRouter } from "../modules/settings/settings.routes";
import { configRouter } from "../modules/config/config.routes";
import { modsRouter } from "../modules/mods/mods.routes";
import { serverControlRouter } from "../modules/server-control/serverControl.routes";
import { rconRouter } from "../modules/rcon/rcon.routes";
import { logsRouter } from "../modules/logs/logs.routes";
import { cftoolsRouter } from "../modules/cftools/cftools.routes";

/**
 * Root API router.
 *
 * Each feature module registers its own router, similar to how tools like
 * MCSManager organize functionality into isolated parts.
 */
export function createApiRouter() {
  const router = Router();

  router.get("/ping", (_req, res) => res.json({ message: "pong" }));

  router.use("/settings", settingsRouter);
  router.use("/config", configRouter);
  router.use("/mods", modsRouter);
  router.use("/server", serverControlRouter);
  router.use("/rcon", rconRouter);
  router.use("/logs", logsRouter);
  router.use("/cftools", cftoolsRouter);

  return router;
}
