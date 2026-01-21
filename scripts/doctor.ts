import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getPrisma } from "../server/db/prisma";
import { SettingsService } from "../server/modules/settings/settings.service";

type CheckStatus = "ok" | "warn" | "fail";

dotenv.config();

const results: Array<{ label: string; status: CheckStatus; details: string }> = [];

function record(label: string, status: CheckStatus, details: string) {
  results.push({ label, status, details });
}

function formatStatus(status: CheckStatus) {
  if (status === "ok") return "OK";
  if (status === "warn") return "WARN";
  return "FAIL";
}

async function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0] ?? 0);
  if (major >= 22) {
    record("Node.js", "ok", `Detected ${process.versions.node}`);
  } else {
    record("Node.js", "warn", `Detected ${process.versions.node}. Recommended 22.x.`);
  }
}

async function checkPrismaClient() {
  const prismaClientPath = path.join(process.cwd(), "node_modules", ".prisma", "client");
  const prismaClientJs = path.join(process.cwd(), "node_modules", "@prisma", "client");
  if (fs.existsSync(prismaClientPath) || fs.existsSync(prismaClientJs)) {
    record("Prisma client", "ok", "Generated client found.");
  } else {
    record("Prisma client", "fail", "Missing generated client. Run `npm run db:setup`.");
  }
}

async function checkDatabase() {
  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT 1`;
    record("Database", "ok", "Connection succeeded.");
  } catch (error) {
    record("Database", "fail", `Connection failed: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkDistOutput() {
  const distPath = path.join(process.cwd(), "dist", "server", "node-build.mjs");
  if (fs.existsSync(distPath)) {
    record("Build output", "ok", "dist/server/node-build.mjs exists.");
  } else {
    record("Build output", "fail", "Missing dist/server/node-build.mjs. Run `npm run build`.");
  }
}

async function checkSettings() {
  const prisma = getPrisma();
  const settings = new SettingsService(prisma);
  try {
    const current = await settings.get();
    const checks = [
      {
        label: "SteamCMD path",
        value: current.steamcmdPath,
        exists: fs.existsSync(current.steamcmdPath),
      },
      {
        label: "DayZ server path",
        value: current.dayzServerPath,
        exists: fs.existsSync(current.dayzServerPath),
      },
      {
        label: "Profiles path",
        value: current.profilesPath,
        exists: fs.existsSync(current.profilesPath),
      },
      {
        label: "ApiBridge path",
        value: current.apiBridgePath,
        exists: fs.existsSync(current.apiBridgePath),
      },
    ];

    for (const check of checks) {
      if (!check.value) {
        record("Settings", "fail", `${check.label} is empty.`);
        continue;
      }
      if (check.exists) {
        record("Settings", "ok", `${check.label} set (${check.value}).`);
      } else {
        record("Settings", "warn", `${check.label} set but missing on disk (${check.value}).`);
      }
    }
  } catch (error) {
    record("Settings", "fail", `Failed to read settings: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await checkNodeVersion();
  await checkPrismaClient();
  await checkDatabase();
  await checkDistOutput();
  await checkSettings();

  const longest = results.reduce((max, item) => Math.max(max, item.label.length), 0);
  for (const result of results) {
    const paddedLabel = result.label.padEnd(longest, " ");
    console.log(`[${formatStatus(result.status)}] ${paddedLabel} - ${result.details}`);
  }

  const hasFailures = results.some((result) => result.status === "fail");
  if (hasFailures) {
    process.exit(1);
  }
}

run();
