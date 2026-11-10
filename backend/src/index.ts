import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifierMongo } from "./baseDeDonnees.js";
import { lireVariable } from "./config.js";
import { MongooseCategorieRepository } from "./repositories/MongooseCategorieRepository.js";
import { MongooseParametresRepository } from "./repositories/MongooseParametresRepository.js";
import { MongooseProduitRepository } from "./repositories/MongooseProduitRepository.js";
import { MongooseStockRepository } from "./repositories/MongooseStockRepository.js";
import { MongooseUtilisateurRepository } from "./repositories/MongooseUtilisateurRepository.js";
import { MongooseVenteRepository } from "./repositories/MongooseVenteRepository.js";
import { AuthService } from "./services/AuthService.js";
import { CategorieService } from "./services/CategorieService.js";
import { ParametresService } from "./services/ParametresService.js";
import { ProduitService } from "./services/ProduitService.js";
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
const produitService = new ProduitService(produits, categories, stocks);
const categorieService = new CategorieService(categories, produits);
const stockService = new StockService(stocks, produits);
const parametres = new MongooseParametresRepository();
const parametresService = new ParametresService(parametres);
const venteService = new VenteService(new MongooseVenteRepository(), produits, stocks, parametres);

const app = createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  parametresService,
  venteService,
  verifierBase: verifierMongo,
});
app.listen(port, () => {
  console.log(`API → http://localhost:${port}`);
});
