import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { servirFront } from "./front.js";
import { identifierRequete, journaliserRequetes, type Journal } from "./journal.js";
import { routesAuth } from "./routes/auth.js";
import { routesCategories } from "./routes/categories.js";
import { routesProduits } from "./routes/produits.js";
import { routesSante, type VerifierBase } from "./routes/sante.js";
import { routesStock } from "./routes/stock.js";
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
  // Production : dossier du front compilé, servi sur la même origine que l'API.
  dossierFront?: string;
  // Journal d'une ligne par requête ; aucun par défaut (tests).
  journal?: Journal;
}

export function createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  verifierBase,
  dossierFront,
  journal,
}: Dependances) {
  const app = express();

  app.disable("x-powered-by");
  app.use(identifierRequete);
  if (journal) {
    app.use(journaliserRequetes(journal));
  }
  app.use(express.json());

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));
  app.use("/api/produits", routesProduits(produitService, authService));
  app.use("/api/categories", routesCategories(categorieService, authService));
  app.use("/api", routesStock(stockService, authService));
  if (dossierFront) {
    app.use(servirFront(dossierFront));
  }

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
