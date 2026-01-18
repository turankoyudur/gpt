import "dotenv/config";
import cors from "cors";
import express from "express";

import { createLogger } from "./core/logger";
import { getPrisma } from "./db/prisma";
import { createErrorHandler } from "./middleware/errorHandler";
import { createApiRouter } from "./routes";

/**
 * Creates an Express app.
 *
 * NOTE: We keep server initialization logic here so it can run in:
 * - local node build (node-build.ts)
 * - serverless function wrappers (if you ever deploy on Netlify, etc.)
 */
export function createServer() {
  const app = express();

  const logger = createLogger();
  const db = getPrisma();

  // Make core services available to any route/middleware through app.locals
  app.locals.logger = logger;
  app.locals.db = db;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Simple health endpoint
  app.get("/health", (_req, res) => {
    res.json({ ok: true, version: "0.1.0" });
  });

  // API routes
  app.use("/api", createApiRouter());

  // Error handler must be last
  app.use(createErrorHandler({ logger, db }));

  return app;
}
