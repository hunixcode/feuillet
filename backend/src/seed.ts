import "dotenv/config";
import mongoose from "mongoose";
import { lireVariable } from "./config.js";
import { ErreurApi } from "./erreurs.js";
import { dateDuJour, horlogeSysteme } from "./horloge.js";
import { CATEGORIES_DEPART, PRODUITS_DEMO } from "./produitsDemo.js";
import { MongooseCategorieRepository } from "./repositories/MongooseCategorieRepository.js";
import { MongooseProduitRepository, ProduitModel } from "./repositories/MongooseProduitRepository.js";
import { MongooseStockRepository } from "./repositories/MongooseStockRepository.js";
import { UtilisateurModel } from "./repositories/MongooseUtilisateurRepository.js";
import { hasherMotDePasse } from "./services/AuthService.js";
import { CategorieService } from "./services/CategorieService.js";
import { ProduitService } from "./services/ProduitService.js";

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
  },
  { upsert: true },
);
console.log(`Compte responsable prêt : ${email}`);

const produitRepository = new MongooseProduitRepository();
const categorieRepository = new MongooseCategorieRepository();
const stockRepository = new MongooseStockRepository();

// Catégories de départ ajoutées si absentes ; celles créées ou renommées par le responsable sont conservées.
const categories = new CategorieService(categorieRepository, produitRepository);
for (const libelle of CATEGORIES_DEPART) {
  await categories.creer({ libelle }).catch((erreur: unknown) => {
    if (!(erreur instanceof ErreurApi && erreur.code === "CATEGORIE_DEJA_EXISTANTE")) {
      throw erreur;
    }
  });
}
console.log("Catégories de départ prêtes");

// Seuls les produits de démonstration sont réinitialisés : les autres produits de la base sont conservés.
const produits = new ProduitService(produitRepository, categorieRepository, stockRepository);
const aujourdhui = dateDuJour(horlogeSysteme);
await ProduitModel.init();
await ProduitModel.deleteMany({ reference: { $in: PRODUITS_DEMO.map((p) => p.reference) } });
for (const { promotion, ...fiche } of PRODUITS_DEMO) {
  const { id } = await produits.creer(fiche);
  if (promotion) {
    const fin = new Date(Date.parse(aujourdhui) + promotion.jours * 86_400_000).toISOString().slice(0, 10);
    await produits.ajouterPromotion(id, { remise: promotion.remise, debut: aujourdhui, fin });
  }
}
console.log(`${PRODUITS_DEMO.length} produits de démonstration prêts`);

await mongoose.disconnect();
