import type { Horloge } from "../horloge.js";
import { MemoireCategorieRepository } from "../repositories/MemoireCategorieRepository.js";
import { MemoireDemandeRepository } from "../repositories/MemoireDemandeRepository.js";
import { MemoireParametresRepository } from "../repositories/MemoireParametresRepository.js";
import { MemoireProduitRepository } from "../repositories/MemoireProduitRepository.js";
import { MemoireRetourRepository } from "../repositories/MemoireRetourRepository.js";
import {
  MemoireCommandeFournisseurRepository,
  MemoireFournisseurRepository,
  MemoireSeuilAlerteRepository,
} from "../repositories/MemoireReapproRepository.js";
import { MemoireStockRepository } from "../repositories/MemoireStockRepository.js";
import { MemoireVenteRepository } from "../repositories/MemoireVenteRepository.js";
import { CategorieService } from "../services/CategorieService.js";
import { DemandeService } from "../services/DemandeService.js";
import { ParametresService } from "../services/ParametresService.js";
import { ProduitService } from "../services/ProduitService.js";
import { RapportService } from "../services/RapportService.js";
import { ReapproService } from "../services/ReapproService.js";
import { RetourService } from "../services/RetourService.js";
import { StockService } from "../services/StockService.js";
import { VenteService } from "../services/VenteService.js";

export function servicesMemoire(horloge?: Horloge) {
  const produits = new MemoireProduitRepository();
  const categories = new MemoireCategorieRepository();
  const stocks = new MemoireStockRepository();
  const parametres = new MemoireParametresRepository();
  const demandes = new MemoireDemandeRepository(stocks);
  const notifications = demandes.notifications;
  const ventes = new MemoireVenteRepository(stocks, demandes);
  const fournisseurs = new MemoireFournisseurRepository();
  const commandesFournisseur = new MemoireCommandeFournisseurRepository(demandes);
  const seuils = new MemoireSeuilAlerteRepository();
  const retours = new MemoireRetourRepository(stocks);
  const demandeService = new DemandeService(demandes, notifications, produits, stocks, parametres, horloge);
  const reapproService = new ReapproService(
    fournisseurs,
    commandesFournisseur,
    seuils,
    produits,
    stocks,
    parametres,
    demandeService,
    horloge,
  );
  const produitService = new ProduitService(produits, categories, stocks, horloge, {
    autresHistoriques: [(id) => demandes.aDesDemandes(id), (id) => commandesFournisseur.aDesCommandes(id)],
    arriveesPrevues: (ids) => reapproService.arriveesPrevues(ids),
  });
  const venteService = new VenteService(ventes, produits, stocks, parametres, demandes, horloge);
  return {
    repositories: {
      produits,
      categories,
      stocks,
      parametres,
      ventes,
      demandes,
      notifications,
      fournisseurs,
      commandesFournisseur,
      seuils,
      retours,
    },
    produitService,
    categorieService: new CategorieService(categories, produits),
    stockService: new StockService(stocks, produits, horloge),
    parametresService: new ParametresService(parametres),
    venteService,
    demandeService,
    reapproService,
    retourService: new RetourService(ventes, retours, stocks, parametres, venteService, horloge),
    rapportService: new RapportService(ventes, retours, produits, stocks, reapproService, produitService, horloge),
  };
}
