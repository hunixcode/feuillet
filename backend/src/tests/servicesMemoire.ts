import type { Horloge } from "../horloge.js";
import { MemoireCategorieRepository } from "../repositories/MemoireCategorieRepository.js";
import { MemoireProduitRepository } from "../repositories/MemoireProduitRepository.js";
import { MemoireStockRepository } from "../repositories/MemoireStockRepository.js";
import { CategorieService } from "../services/CategorieService.js";
import { ProduitService } from "../services/ProduitService.js";
import { StockService } from "../services/StockService.js";

export function servicesMemoire(horloge?: Horloge) {
  const produits = new MemoireProduitRepository();
  const categories = new MemoireCategorieRepository();
  const stocks = new MemoireStockRepository();
  return {
    repositories: { produits, categories, stocks },
    produitService: new ProduitService(produits, categories, stocks, horloge),
    categorieService: new CategorieService(categories, produits),
    stockService: new StockService(stocks, produits, horloge),
  };
}
