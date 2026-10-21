import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifierMongo } from "./baseDeDonnees.js";
import { lireVariable } from "./config.js";
import { MongooseProduitRepository } from "./repositories/MongooseProduitRepository.js";
import { MongooseUtilisateurRepository } from "./repositories/MongooseUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { ProduitService } from "./services/ProduitService.js";

const port = Number(process.env.PORT ?? 3000);
const mongoUri = lireVariable("MONGODB_URI");
const secretJwt = lireVariable("JWT_SECRET");
if (secretJwt.length < 32) {
  console.error("JWT_SECRET doit contenir au moins 32 caractères");
  process.exit(1);
}

await mongoose.connect(mongoUri);
console.log("MongoDB connecté");

const authService = new AuthService(new MongooseUtilisateurRepository(), { secretJwt });

const produitService = new ProduitService(new MongooseProduitRepository());

createApp({ authService, produitService, verifierBase: verifierMongo }).listen(port, () => {
  console.log(`API → http://localhost:${port}`);
});
