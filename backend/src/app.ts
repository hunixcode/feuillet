import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { creerLimiteurs, LIMITES_PAR_DEFAUT, type LimitesRequetes } from "./limitesRequetes.js";
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
  /** Limites de requêtes ; valeurs basses dans les tests. */
  limites?: LimitesRequetes;
  /** Réglage `trust proxy` d'Express : `1` derrière le proxy de Render, sinon toutes les requêtes ont la même IP. */
  confianceProxy?: boolean | number | string;
}

export function createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  verifierBase,
  limites = LIMITES_PAR_DEFAUT,
  confianceProxy = false,
}: Dependances) {
  const app = express();
  const limiteurs = creerLimiteurs(limites);

  app.disable("x-powered-by");
  app.set("trust proxy", confianceProxy);
  app.use(express.json());

  app.post("/api/auth/connexion", limiteurs.connexion);
  app.post("/api/auth/inscription", limiteurs.inscription);
  app.get(["/api/produits", "/api/produits/*chemin"], limiteurs.publique);
  app.post("/api/commandes/devis", limiteurs.publique);

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));
  app.use("/api/produits", routesProduits(produitService, authService));
  app.use("/api/categories", routesCategories(categorieService, authService));
  app.use("/api", routesStock(stockService, authService));

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
