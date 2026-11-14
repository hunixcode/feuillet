import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Configuration {
  production: boolean;
  port: number;
  mongoUri: string;
  secretJwt: string;
  // En production, dossier du front compilé servi par l'API (même origine, sans CORS).
  dossierFront?: string;
}

const LONGUEUR_MIN_SECRET = 32;

// backend/src/ (tsx) comme backend/dist/ (build) sont à deux niveaux de la racine du dépôt.
export const DOSSIER_FRONT_PAR_DEFAUT = fileURLToPath(new URL("../../frontend/dist", import.meta.url));

export class ConfigurationInvalide extends Error {
  constructor(readonly problemes: string[]) {
    super(`Configuration invalide :\n- ${problemes.join("\n- ")}`);
    this.name = "ConfigurationInvalide";
  }
}

// Vérifie toutes les variables d'environnement au démarrage et signale tous les problèmes d'un coup.
export function lireConfiguration(
  env: NodeJS.ProcessEnv,
  dossierFrontExiste: (dossier: string) => boolean = (dossier) => existsSync(join(dossier, "index.html")),
): Configuration {
  const problemes: string[] = [];
  const production = env.NODE_ENV === "production";

  const portTexte = env.PORT?.trim() || "3000";
  const port = Number(portTexte);
  if (!/^\d+$/.test(portTexte) || port < 1 || port > 65535) {
    problemes.push(`PORT doit être un numéro de port entre 1 et 65535 (reçu : « ${env.PORT} »).`);
  }

  const mongoUri = env.MONGODB_URI?.trim() ?? "";
  if (!mongoUri) {
    problemes.push("MONGODB_URI manquante : adresse de la base MongoDB (replica set, pour les transactions).");
  } else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    problemes.push("MONGODB_URI doit commencer par mongodb:// ou mongodb+srv://.");
  }

  const secretJwt = env.JWT_SECRET ?? "";
  if (!secretJwt) {
    problemes.push("JWT_SECRET manquante : chaîne aléatoire d'au moins 32 caractères.");
  } else if (secretJwt.length < LONGUEUR_MIN_SECRET) {
    problemes.push(`JWT_SECRET doit contenir au moins ${LONGUEUR_MIN_SECRET} caractères.`);
  }

  const dossierFront = env.DOSSIER_FRONT?.trim() || DOSSIER_FRONT_PAR_DEFAUT;
  if (production && !dossierFrontExiste(dossierFront)) {
    problemes.push(`Front compilé introuvable dans ${dossierFront} : lancer « npm run build » à la racine du dépôt.`);
  }

  if (problemes.length > 0) {
    throw new ConfigurationInvalide(problemes);
  }
  return { production, port, mongoUri, secretJwt, ...(production && { dossierFront }) };
}
