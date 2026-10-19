import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { routesAuth } from "./routes/auth.js";
import { routesSante, type VerifierBase } from "./routes/sante.js";
import type { AuthService } from "./services/AuthService.js";

export interface Dependances {
  authService: AuthService;
  verifierBase: VerifierBase;
}

export function createApp({ authService, verifierBase }: Dependances) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
