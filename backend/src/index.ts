import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifierMongo } from "./baseDeDonnees.js";
import { lireConfianceProxy, lireOriginesCors, lireVariable } from "./config.js";
import { MongooseCategorieRepository } from "./repositories/MongooseCategorieRepository.js";
import { MongooseDemandeRepository } from "./repositories/MongooseDemandeRepository.js";
import { MongooseNotificationRepository } from "./repositories/MongooseNotificationRepository.js";
import { MongooseParametresRepository } from "./repositories/MongooseParametresRepository.js";
import { MongooseProduitRepository } from "./repositories/MongooseProduitRepository.js";
import { MongooseRetourRepository } from "./repositories/MongooseRetourRepository.js";
import {
  MongooseCommandeFournisseurRepository,
  MongooseFournisseurRepository,
  MongooseSeuilAlerteRepository,
} from "./repositories/MongooseReapproRepository.js";
import { MongooseStockRepository } from "./repositories/MongooseStockRepository.js";
import { MongooseUtilisateurRepository } from "./repositories/MongooseUtilisateurRepository.js";
import { MongooseVenteRepository } from "./repositories/MongooseVenteRepository.js";
import { AuthService } from "./services/AuthService.js";
import { CategorieService } from "./services/CategorieService.js";
import { DemandeService } from "./services/DemandeService.js";
import { ParametresService } from "./services/ParametresService.js";
import { ProduitService } from "./services/ProduitService.js";
import { RapportService } from "./services/RapportService.js";
import { ReapproService } from "./services/ReapproService.js";
import { RetourService } from "./services/RetourService.js";
import { StockService } from "./services/StockService.js";
import { VenteService } from "./services/VenteService.js";

const port = Number(process.env.PORT ?? 3000);
const mongoUri = lireVariable("MONGODB_URI");
const secretJwt = lireVariable("JWT_SECRET");
if (secretJwt.length < 32) {
  console.error("JWT_SECRET doit contenir au moins 32 caractères");
  process.exit(1);
}

await mongoose.connect(mongoUri);
console.log("MongoDB connecté");

const utilisateurs = new MongooseUtilisateurRepository();
const authService = new AuthService(utilisateurs, { secretJwt });

const produits = new MongooseProduitRepository();
const categories = new MongooseCategorieRepository();
const stocks = new MongooseStockRepository();
const demandes = new MongooseDemandeRepository();
const commandesFournisseur = new MongooseCommandeFournisseurRepository();
const categorieService = new CategorieService(categories, produits);
const stockService = new StockService(stocks, produits);
const parametres = new MongooseParametresRepository();
const parametresService = new ParametresService(parametres);
const ventes = new MongooseVenteRepository();
const venteService = new VenteService(ventes, produits, stocks, parametres, demandes);
const retours = new MongooseRetourRepository();
const retourService = new RetourService(ventes, retours, stocks, parametres, venteService);
const demandeService = new DemandeService(demandes, new MongooseNotificationRepository(), produits, stocks, parametres);
const reapproService = new ReapproService(
  new MongooseFournisseurRepository(),
  commandesFournisseur,
  new MongooseSeuilAlerteRepository(),
  produits,
  stocks,
  parametres,
  demandeService,
);
const produitService = new ProduitService(produits, categories, stocks, undefined, {
  autresHistoriques: [(id) => demandes.aDesDemandes(id), (id) => commandesFournisseur.aDesCommandes(id)],
  arriveesPrevues: (ids) => reapproService.arriveesPrevues(ids),
});
const rapportService = new RapportService(ventes, retours, produits, stocks, reapproService, produitService);

const app = createApp({
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
  verifierBase: verifierMongo,
  production: process.env.NODE_ENV === "production",
  originesCors: lireOriginesCors(process.env.CORS_ORIGINES),
  confianceProxy: lireConfianceProxy(process.env.TRUST_PROXY),
});
// RG06 : les mises de côté échues sont libérées chaque minute (et avant chaque liste de demandes).
const MINUTE = 60_000;
setInterval(() => {
  demandeService.expirerEcheances().catch((erreur: unknown) => console.error("Expiration des mises de côté :", erreur));
}, MINUTE).unref();

app.listen(port, () => {
  console.log(`API → http://localhost:${port}`);
});
