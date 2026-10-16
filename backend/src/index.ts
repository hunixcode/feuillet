import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { verifierMongo } from "./baseDeDonnees.js";
import { lireVariable } from "./config.js";
import { MongooseUtilisateurRepository } from "./repositories/MongooseUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";

const port = Number(process.env.PORT ?? 3000);
const mongoUri = lireVariable("MONGODB_URI");
const secretJwt = lireVariable("JWT_SECRET");

await mongoose.connect(mongoUri);
console.log("MongoDB connecté");

const authService = new AuthService(new MongooseUtilisateurRepository(), { secretJwt });

createApp({ authService, verifierBase: verifierMongo }).listen(port, () => {
  console.log(`API → http://localhost:${port}`);
});
