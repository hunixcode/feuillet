import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { routesAuth } from "./routes/auth.js";
import { routesProduits } from "./routes/produits.js";
import { routesSante, type VerifierBase } from "./routes/sante.js";
import type { AuthService } from "./services/AuthService.js";
import type { ProduitService } from "./services/ProduitService.js";

export interface Dependances {
  authService: AuthService;
  produitService: ProduitService;
  verifierBase: VerifierBase;
}

export function createApp({ authService, produitService, verifierBase }: Dependances) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));
  app.use("/api/produits", routesProduits(produitService, authService));

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
