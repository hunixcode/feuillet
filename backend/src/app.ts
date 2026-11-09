import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { routesAuth } from "./routes/auth.js";
import { routesCategories } from "./routes/categories.js";
import { routesProduits } from "./routes/produits.js";
import { routesSante, type VerifierBase } from "./routes/sante.js";
import { routesStock } from "./routes/stock.js";
import { corsAutorise, enTetesSecurite, TAILLE_MAX_CORPS } from "./securite.js";
import type { AuthService } from "./services/AuthService.js";
import type { CategorieService } from "./services/CategorieService.js";
import type { ProduitService } from "./services/ProduitService.js";
import type { StockService } from "./services/StockService.js";

export interface Dependances {
  authService: AuthService;
  produitService: ProduitService;
  categorieService: CategorieService;
  stockService: StockService;
  verifierBase: VerifierBase;
  /** Active Strict-Transport-Security (HTTPS seulement). */
  production?: boolean;
  /** Origines autorisées en CORS, seulement si le front est servi ailleurs ; vide : même origine. */
  originesCors?: string[];
}

export function createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  verifierBase,
  production = false,
  originesCors = [],
}: Dependances) {
  const app = express();

  app.disable("x-powered-by");
  app.use(enTetesSecurite({ production }));
  app.use(corsAutorise(originesCors));
  app.use(express.json({ limit: TAILLE_MAX_CORPS }));

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));
  app.use("/api/produits", routesProduits(produitService, authService));
  app.use("/api/categories", routesCategories(categorieService, authService));
  app.use("/api", routesStock(stockService, authService));

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
