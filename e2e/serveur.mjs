// Lance l'application comme en production pour les tests de bout en bout :
// MongoDB temporaire en replica set (transactions), seed, puis l'API qui sert le front compilé.
// Prérequis : « npm run build » à la racine du dépôt.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { PORT, RESPONSABLE } from "./config.mjs";

const racine = fileURLToPath(new URL("..", import.meta.url));
const ici = fileURLToPath(new URL(".", import.meta.url));
const api = fileURLToPath(new URL("../backend/dist/index.js", import.meta.url));
const seed = fileURLToPath(new URL("../backend/dist/seed.js", import.meta.url));
const front = fileURLToPath(new URL("../frontend/dist", import.meta.url));

for (const fichier of [api, seed, `${front}/index.html`]) {
  if (!existsSync(fichier)) {
    console.error(`${fichier} introuvable : lancer « npm run build » dans ${racine}.`);
    process.exit(1);
  }
}

const base = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });

// Toutes les variables sont données ici : lancé depuis e2e/, aucun fichier .env n'est lu.
const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(PORT),
  MONGODB_URI: base.getUri("librairie-e2e"),
  JWT_SECRET: randomBytes(32).toString("hex"),
  RESPONSABLE_EMAIL: RESPONSABLE.email,
  RESPONSABLE_MOT_DE_PASSE: RESPONSABLE.motDePasse,
  DOSSIER_FRONT: front,
  CORS_ORIGINES: "",
  TRUST_PROXY: "",
};

let enfant;
let arretEnCours = false;

async function arreter(code) {
  if (arretEnCours) return;
  arretEnCours = true;
  enfant?.kill();
  await base.stop().catch(() => {});
  process.exit(code);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void arreter(0));
}

function lancer(script) {
  enfant = spawn(process.execPath, [script], { cwd: ici, env, stdio: "inherit" });
  return enfant;
}

// Lancement asynchrone : la sortie de mongod doit continuer d'être lue pendant le seed.
const codeSeed = await new Promise((resoudre) => lancer(seed).on("exit", resoudre));
if (codeSeed !== 0) {
  console.error(`Le seed a échoué (code ${codeSeed}).`);
  await arreter(1);
}

lancer(api).on("exit", (code) => void arreter(code ?? 1));
