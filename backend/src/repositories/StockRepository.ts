import type { FiltresMouvements, Mouvement, NouveauMouvement, Stock } from "../modeles/stock.js";

export class StockModifieErreur extends Error {
  constructor(produitId: string) {
    super(`Le stock du produit ${produitId} a changé entre-temps`);
    this.name = "StockModifieErreur";
  }
}

export interface StockRepository {
  trouver(produitId: string): Promise<Stock>;
  trouverPlusieurs(produitIds: string[]): Promise<Map<string, Stock>>;
  // Passe de `avant` à `apres` et enregistre le mouvement, tout ou rien ; StockModifieErreur si le stock n'est plus `avant`.
  enregistrer(produitId: string, avant: Stock, apres: Stock, mouvement?: NouveauMouvement): Promise<void>;
  listerMouvements(filtres: FiltresMouvements): Promise<Mouvement[]>;
  aDesMouvements(produitId: string): Promise<boolean>;
}
