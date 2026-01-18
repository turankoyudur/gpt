import fs from "fs";
import path from "path";
import dotenv from "dotenv";

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
  try {
    // Dinamik import: prisma generate yoksa bile doctor script tamamen patlamasın
    const { getPrisma } = await import("../server/db/prisma");
    const prisma = getPrisma();

    try {
      await prisma.$queryRaw`SELECT 1`;
      record("Database", "ok", "Connection succeeded.");
    } catch (error) {
      record("Database", "fail", `Connection failed: ${(error as Error).message}`);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    record(
      "Database",
      "fail",
      `Prisma client unavailable. Run \`npm run db:setup\`. (${(error as Error).message})`,
    );
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
  try {
    // Dinamik import: DB hazır değilse bile doctor çalışsın
    const [{ getPrisma }, { SettingsService }] = await Promise.all([
      import("../server/db/prisma"),
      import("../server/modules/settings/settings.service"),
    ]);

    const prisma = getPrisma();
    const settings = new SettingsService(prisma);

    try {
      const current = await settings.get();
      const checks = [
        {
          label: "SteamCMD path",
          value: current.steamcmdPath,
          exists: current.steamcmdPath ? fs.existsSync(current.steamcmdPath) : false,
        },
        {
          label: "DayZ server path",
          value: current.dayzServerPath,
          exists: current.dayzServerPath ? fs.existsSync(current.dayzServerPath) : false,
        },
        {
          label: "BattlEye cfg path",
          value: current.battleyeCfgPath,
          exists: current.battleyeCfgPath ? fs.existsSync(current.battleyeCfgPath) : false,
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
  } catch (error) {
    record("Settings", "fail", `Settings check skipped: Prisma client unavailable. (${(error as Error).message})`);
  }
}

async function checkRconDependency() {
  const battleyePath = path.join(process.cwd(), "node_modules", "battleye");
  if (!fs.existsSync(battleyePath)) {
    record("RCON dependency", "warn", "battleye package not found in node_modules.");
    return;
  }

  try {
    await import("battleye");
    record("RCON dependency", "ok", "battleye package import succeeded.");
  } catch (error) {
    record(
      "RCON dependency",
      "warn",
      `battleye package present but failed to import: ${(error as Error).message}`,
    );
  }
}

async function run() {
  await checkNodeVersion();
  await checkPrismaClient();
  await checkDatabase();
  await checkDistOutput();
  await checkSettings();
  await checkRconDependency();

  const longest = results.reduce((max, item) => Math.max(max, item.label.length), 0);
  for (const result of results) {
    const paddedLabel = result.label.padEnd(longest, " ");
    console.log(`[${formatStatus(result.status)}] ${paddedLabel} - ${result.details}`);
  }

  const hasFailures = results.some((result) => result.status === "fail");
  if (hasFailures) process.exit(1);
}

run();
