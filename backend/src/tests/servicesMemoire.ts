import type { Horloge } from "../horloge.js";
import { MemoireCategorieRepository } from "../repositories/MemoireCategorieRepository.js";
import { MemoireParametresRepository } from "../repositories/MemoireParametresRepository.js";
import { MemoireProduitRepository } from "../repositories/MemoireProduitRepository.js";
import { MemoireStockRepository } from "../repositories/MemoireStockRepository.js";
import { CategorieService } from "../services/CategorieService.js";
import { ParametresService } from "../services/ParametresService.js";
import { ProduitService } from "../services/ProduitService.js";
import { StockService } from "../services/StockService.js";

export function servicesMemoire(horloge?: Horloge) {
  const produits = new MemoireProduitRepository();
  const categories = new MemoireCategorieRepository();
  const stocks = new MemoireStockRepository();
  const parametres = new MemoireParametresRepository();
  return {
    repositories: { produits, categories, stocks, parametres },
    produitService: new ProduitService(produits, categories, stocks, horloge),
    categorieService: new CategorieService(categories, produits),
    stockService: new StockService(stocks, produits, horloge),
    parametresService: new ParametresService(parametres),
  };
}
