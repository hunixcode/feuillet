import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { routesAuth } from "./routes/auth.js";
import { routesCategories } from "./routes/categories.js";
import { routesDemandes, routesNotifications } from "./routes/demandes.js";
import { routesParametres } from "./routes/parametres.js";
import { routesProduits } from "./routes/produits.js";
import { routesRapports, routesRetours } from "./routes/rapports.js";
import { routesReappro } from "./routes/reappro.js";
import { routesSante, type VerifierBase } from "./routes/sante.js";
import { routesStock } from "./routes/stock.js";
import { routesCommandes, routesVentes } from "./routes/ventes.js";
import type { AuthService } from "./services/AuthService.js";
import type { CategorieService } from "./services/CategorieService.js";
import type { DemandeService } from "./services/DemandeService.js";
import type { ParametresService } from "./services/ParametresService.js";
import type { ProduitService } from "./services/ProduitService.js";
import type { RapportService } from "./services/RapportService.js";
import type { ReapproService } from "./services/ReapproService.js";
import type { RetourService } from "./services/RetourService.js";
import type { StockService } from "./services/StockService.js";
import type { VenteService } from "./services/VenteService.js";

export interface Dependances {
  authService: AuthService;
  produitService: ProduitService;
  categorieService: CategorieService;
  stockService: StockService;
  parametresService: ParametresService;
  venteService: VenteService;
  demandeService: DemandeService;
  reapproService: ReapproService;
  retourService: RetourService;
  rapportService: RapportService;
  verifierBase: VerifierBase;
}

export function createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  parametresService,
  venteService,
  demandeService,
  reapproService,
  retourService,
  rapportService,
  verifierBase,
}: Dependances) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/health", routesSante(verifierBase));
  app.use("/api/auth", routesAuth(authService));
  app.use("/api/produits", routesProduits(produitService, authService));
  app.use("/api/categories", routesCategories(categorieService, authService));
  app.use("/api/parametres", routesParametres(parametresService, authService));
  app.use("/api/commandes", routesCommandes(venteService, authService));
  app.use("/api/ventes", routesVentes(venteService, authService));
  app.use("/api/ventes", routesRetours(retourService, authService));
  app.use("/api/demandes", routesDemandes(demandeService, authService));
  app.use("/api/notifications", routesNotifications(demandeService, authService));
  app.use("/api", routesStock(stockService, authService));
  app.use("/api", routesReappro(reapproService, authService));
  app.use("/api", routesRapports(rapportService, authService));

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
