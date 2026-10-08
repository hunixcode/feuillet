import express from "express";
import { errorHandler } from "./middlewares/error.js";
import { router } from "./routes/index.js";

/**
 * Crée l'application sans écouter un port : testable en mémoire
 * avec supertest, sans serveur réel.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  app.use("/api", router);

  app.use(errorHandler);

  return app;
}
