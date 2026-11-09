import "dotenv/config";
import mongoose from "mongoose";
import { lireVariable } from "./config.js";
import { ErreurApi } from "./erreurs.js";
import { dateDuJour, horlogeSysteme, type Horloge } from "./horloge.js";
import { CATEGORIES_DEPART, JOURS_INVENTAIRE_DEMO, PRODUITS_DEMO, VENTES_DEMO } from "./produitsDemo.js";
import { MongooseCategorieRepository } from "./repositories/MongooseCategorieRepository.js";
import { MongooseParametresRepository } from "./repositories/MongooseParametresRepository.js";
import { MongooseProduitRepository, ProduitModel } from "./repositories/MongooseProduitRepository.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./repositories/MongooseStockRepository.js";
import { MongooseUtilisateurRepository, UtilisateurModel } from "./repositories/MongooseUtilisateurRepository.js";
import { MongooseVenteRepository, VenteModel } from "./repositories/MongooseVenteRepository.js";
import { hasherMotDePasse } from "./services/AuthService.js";
import { CategorieService } from "./services/CategorieService.js";
import { ProduitService } from "./services/ProduitService.js";
import { StockService } from "./services/StockService.js";
import { VenteService } from "./services/VenteService.js";

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

// Valeurs de départ des paramètres, sans écraser celles réglées par le responsable.
const parametresRepository = new MongooseParametresRepository();
await parametresRepository.initialiser();
console.log("Paramètres prêts");

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

// Horloge reculée de quelques jours : inventaire de départ puis ventes passées de démonstration.
const ilYa = (jours: number): Horloge => ({
  maintenant: () => new Date(horlogeSysteme.maintenant().getTime() - jours * 86_400_000),
});

// Seuls les produits de démonstration sont réinitialisés : les autres produits de la base sont conservés.
const produits = new ProduitService(produitRepository, categorieRepository, stockRepository);
const stocks = new StockService(stockRepository, produitRepository, ilYa(JOURS_INVENTAIRE_DEMO));
const aujourdhui = dateDuJour(horlogeSysteme);
await ProduitModel.init();
const anciens = { reference: { $in: PRODUITS_DEMO.map((p) => p.reference) } };
const idsAnciens = (await ProduitModel.find(anciens, { _id: 1 }).lean()).map((p) => p._id.toString());
await StockModel.deleteMany({ _id: { $in: idsAnciens } });
await MouvementModel.deleteMany({ produitId: { $in: idsAnciens } });
await VenteModel.deleteMany({ "lignes.produitId": { $in: idsAnciens } });
await ProduitModel.deleteMany(anciens);
const idsDemo = new Map<string, string>();
for (const { promotion, stock, ...fiche } of PRODUITS_DEMO) {
  const { id } = await produits.creer(fiche);
  idsDemo.set(fiche.reference, id);
  await stocks.corrigerInventaire(id, { quantiteComptee: stock, motif: "Stock de démonstration" });
  if (promotion) {
    const fin = new Date(Date.parse(aujourdhui) + promotion.jours * 86_400_000).toISOString().slice(0, 10);
    await produits.ajouterPromotion(id, { remise: promotion.remise, debut: aujourdhui, fin });
  }
}
console.log(`${PRODUITS_DEMO.length} produits de démonstration prêts`);

// Ventes au comptoir passées, enregistrées comme au comptoir avec l'horloge du jour de la vente.
const ventesRepository = new MongooseVenteRepository();
const utilisateurRepository = new MongooseUtilisateurRepository();
for (const { jours, lignes, ...options } of VENTES_DEMO) {
  const ventes = new VenteService(
    ventesRepository,
    produitRepository,
    stockRepository,
    parametresRepository,
    utilisateurRepository,
    ilYa(jours),
  );
  await ventes.vendreAuComptoir({
    ...options,
    lignes: lignes.map(([reference, quantite]) => ({ produitId: idsDemo.get(reference), quantite })),
  });
}
console.log(`${VENTES_DEMO.length} ventes de démonstration prêtes`);

await mongoose.disconnect();
