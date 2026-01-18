import fs from "fs";
import path from "path";
import winston from "winston";
import "winston-daily-rotate-file";

/**
 * Central logger for the whole app.
 *
 * - Writes to console
 * - Writes to ./data/logs/app-YYYY-MM-DD.log (rotated daily)
 * - Structured JSON output for easy searching
 */
export function createLogger() {
  const logsDir = path.resolve(process.cwd(), "data", "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const rotate = new (winston.transports as any).DailyRotateFile({
    dirname: logsDir,
    filename: "app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d",
    zippedArchive: true,
  });

  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf((info) => {
            // Human-readable console output
            const msg = typeof info.message === "string" ? info.message : JSON.stringify(info.message);
            return `${info.timestamp} ${info.level}: ${msg}`;
          }),
        ),
      }),
      rotate,
    ],
  });

  return logger;
}

export type AppLogger = ReturnType<typeof createLogger>;
