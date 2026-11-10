import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { creerArret } from "./arret.js";
import { verifierMongo } from "./baseDeDonnees.js";
import { ConfigurationInvalide, lireConfiguration, type Configuration } from "./configuration.js";
import { MongooseCategorieRepository } from "./repositories/MongooseCategorieRepository.js";
import { MongooseProduitRepository } from "./repositories/MongooseProduitRepository.js";
import { MongooseStockRepository } from "./repositories/MongooseStockRepository.js";
import { MongooseUtilisateurRepository } from "./repositories/MongooseUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { CategorieService } from "./services/CategorieService.js";
import { ProduitService } from "./services/ProduitService.js";
import { StockService } from "./services/StockService.js";

let configuration: Configuration;
try {
  configuration = lireConfiguration(process.env);
} catch (erreur) {
  if (erreur instanceof ConfigurationInvalide) {
    console.error(`${erreur.message}\nVoir backend/.env.example.`);
    process.exit(1);
  }
  throw erreur;
}
const { production, port, mongoUri, secretJwt, dossierFront } = configuration;

// En production, les index sont créés explicitement ci-dessous, au démarrage, plutôt qu'en tâche de fond.
mongoose.set("autoIndex", !production);
await mongoose.connect(mongoUri);
await Promise.all(mongoose.modelNames().map((nom) => mongoose.model(nom).createIndexes()));
console.log("MongoDB connecté, index à jour");

const authService = new AuthService(new MongooseUtilisateurRepository(), { secretJwt });

const produits = new MongooseProduitRepository();
const categories = new MongooseCategorieRepository();
const stocks = new MongooseStockRepository();
const produitService = new ProduitService(produits, categories, stocks);
const categorieService = new CategorieService(categories, produits);
const stockService = new StockService(stocks, produits);

const app = createApp({
  authService,
  produitService,
  categorieService,
  stockService,
  verifierBase: verifierMongo,
  ...(dossierFront && { dossierFront }),
  journal: (ligne) => console.log(ligne),
});
const serveur = app.listen(port, () => {
  console.log(`API → http://localhost:${port}${dossierFront ? ` (front servi depuis ${dossierFront})` : ""}`);
});

// Arrêt propre : SIGTERM de l'hébergeur (Render, Docker), SIGINT au clavier.
const arreter = creerArret({ serveur, fermer: () => mongoose.disconnect(), journal: (ligne) => console.log(ligne) });
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void arreter().then((propre) => process.exit(propre ? 0 : 1));
  });
}
