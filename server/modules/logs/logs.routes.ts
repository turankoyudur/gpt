import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import { AppError, ErrorCodes } from "../../core/errors";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";

const logsRouter = Router();
const logsDir = path.resolve(process.cwd(), "data", "logs");

logsRouter.get("/", async (_req, res, next) => {
  try {
    const entries = await fs.readdir(logsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const fullPath = path.join(logsDir, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            size: stats.size,
            mtimeMs: stats.mtimeMs,
          };
        }),
    );

    files.sort((a, b) => b.mtimeMs - a.mtimeMs);

    res.json({
      logsDir,
      files,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to list log files.",
        cause: error,
      }),
    );
  }
});

logsRouter.get("/tail", async (req, res, next) => {
  const file = typeof req.query.file === "string" ? req.query.file : "";
  const linesParam = Number(req.query.lines ?? 200);
  const lines = Number.isFinite(linesParam) ? Math.max(1, Math.min(linesParam, 2000)) : 200;

  if (!file) {
    return next(
      new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Query param 'file' is required.",
      }),
    );
  }

  const fullPath = path.resolve(logsDir, file);
  if (!fullPath.startsWith(logsDir)) {
    return next(
      new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Invalid log file path.",
      }),
    );
  }

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const allLines = content.split(/\r?\n/);
    const tailLines = allLines.slice(-lines);
    res.json({ file, lines: tailLines });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_NOT_FOUND,
        status: 404,
        message: "Log file not found.",
        cause: error,
        context: { file },
      }),
    );
  }
});

logsRouter.get("/rpt/latest", async (req, res, next) => {
  const linesParam = Number(req.query.lines ?? 200);
  const lines = Number.isFinite(linesParam) ? Math.max(1, Math.min(linesParam, 2000)) : 200;

  try {
    const settings = await new SettingsService(getPrisma()).get();
    const profilesPath = settings.profilesPath;
    const entries = await fs.readdir(profilesPath, { withFileTypes: true });
    const rptCandidates = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && /dayzserver_x64.*\.rpt$/i.test(entry.name))
        .map(async (entry) => {
          const fullPath = path.join(profilesPath, entry.name);
          const stats = await fs.stat(fullPath);
          return { name: entry.name, fullPath, mtimeMs: stats.mtimeMs };
        }),
    );

    if (!rptCandidates.length) {
      return next(
        new AppError({
          code: ErrorCodes.FILE_NOT_FOUND,
          status: 404,
          message: "No DayZServer_x64*.RPT files found in profiles path.",
          context: { profilesPath },
        }),
      );
    }

    rptCandidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const latest = rptCandidates[0];
    const content = await fs.readFile(latest.fullPath, "utf-8");
    const allLines = content.split(/\r?\n/);
    const tailLines = allLines.slice(-lines);

    res.json({
      file: latest.name,
      mtimeMs: latest.mtimeMs,
      profilesPath,
      lines: tailLines,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to read latest RPT log.",
        cause: error,
      }),
    );
  }
});

export { logsRouter };
