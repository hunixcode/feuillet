/**
 * Configuration centralisée : toutes les variables d'env sont lues ici
 * et nulle part ailleurs dans le code.
 */
export interface Env {
  port: number;
  mongoUri: string;
  nodeEnv: "development" | "test" | "production";
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const nodeEnv = source.NODE_ENV ?? "development";
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error(`NODE_ENV invalide : "${nodeEnv}" (attendu development|test|production)`);
  }

  const mongoUri = source.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI manquante — copier .env.example vers .env");
  }

  const rawPort = source.PORT ?? "3000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT invalide : "${rawPort}"`);
  }

  return { port, mongoUri, nodeEnv };
}
