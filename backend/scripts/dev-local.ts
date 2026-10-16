import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

const env = {
  ...process.env,
  MONGODB_URI: replSet.getUri("librairie"),
  JWT_SECRET: process.env.JWT_SECRET || "secret-dev-local",
  RESPONSABLE_EMAIL: process.env.RESPONSABLE_EMAIL || "responsable@librairie.pf",
  RESPONSABLE_MOT_DE_PASSE: process.env.RESPONSABLE_MOT_DE_PASSE || "responsable123",
};

const tsx = fileURLToPath(new URL("../node_modules/.bin/tsx", import.meta.url));

function lancer(args: string[]) {
  return spawn(tsx, args, { env, stdio: "inherit" });
}

console.log("Base MongoDB en mémoire démarrée (données perdues à l'arrêt)");

const seed = lancer(["src/seed.ts"]);
const codeSeed = await new Promise<number | null>((resolve) => seed.on("exit", resolve));
if (codeSeed !== 0) {
  await replSet.stop();
  process.exit(codeSeed ?? 1);
}

const api = lancer(["watch", "src/index.ts"]);

async function arreter() {
  api.kill("SIGTERM");
  await new Promise((resolve) => api.once("exit", resolve));
  await replSet.stop();
  process.exit(0);
}

process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
