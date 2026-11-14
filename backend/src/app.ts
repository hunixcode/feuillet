import express from "express";
import { gererErreurs, routeIntrouvable } from "./erreurs.js";
import { servirFront } from "./front.js";
import { identifierRequete, journaliserRequetes, type Journal } from "./journal.js";
import { creerLimiteurs, LIMITES_PAR_DEFAUT, type LimitesRequetes } from "./limitesRequetes.js";
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
import { corsAutorise, enTetesSecurite, TAILLE_MAX_CORPS } from "./securite.js";
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
  // Production : dossier du front compilé, servi sur la même origine que l'API.
  dossierFront?: string;
  // Journal d'une ligne par requête ; aucun par défaut (tests).
  journal?: Journal;
  /** Active Strict-Transport-Security (HTTPS seulement). */
  production?: boolean;
  /** Origines autorisées en CORS, seulement si le front est servi ailleurs ; vide : même origine. */
  originesCors?: string[];
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
  parametresService,
  venteService,
  demandeService,
  reapproService,
  retourService,
  rapportService,
  verifierBase,
  dossierFront,
  journal,
  production = false,
  originesCors = [],
  limites = LIMITES_PAR_DEFAUT,
  confianceProxy = false,
}: Dependances) {
  const app = express();
  const limiteurs = creerLimiteurs(limites);

  app.disable("x-powered-by");
  app.use(identifierRequete);
  if (journal) {
    app.use(journaliserRequetes(journal));
  }
  app.use(enTetesSecurite({ production }));
  app.use(corsAutorise(originesCors));
  app.set("trust proxy", confianceProxy);
  app.use(express.json({ limit: TAILLE_MAX_CORPS }));

  app.post("/api/auth/connexion", limiteurs.connexion);
  app.post("/api/auth/inscription", limiteurs.inscription);
  app.get(["/api/produits", "/api/produits/*chemin"], limiteurs.publique);
  app.post("/api/commandes/devis", limiteurs.publique);
  app.get("/api/meilleures-ventes", limiteurs.publique);

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
  if (dossierFront) {
    app.use(servirFront(dossierFront));
  }

  app.use(routeIntrouvable);
  app.use(gererErreurs);

  return app;
}
