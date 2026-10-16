import "dotenv/config";
import mongoose from "mongoose";
import { lireVariable } from "./config.js";
import { UtilisateurModel } from "./repositories/MongooseUtilisateurRepository.js";
import { hasherMotDePasse } from "./services/AuthService.js";

const mongoUri = lireVariable("MONGODB_URI");
const email = lireVariable("RESPONSABLE_EMAIL").trim().toLowerCase();
const motDePasse = lireVariable("RESPONSABLE_MOT_DE_PASSE");

await mongoose.connect(mongoUri);

await UtilisateurModel.findOneAndUpdate(
  { email },
  {
    nom: "Responsable de stock",
    email,
    motDePasseHash: await hasherMotDePasse(motDePasse),
    role: "responsable",
    $unset: { typeClient: 1 },
  },
  { upsert: true },
);
console.log(`Compte responsable prêt : ${email}`);

await mongoose.disconnect();
