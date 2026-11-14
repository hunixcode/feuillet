import {
  LIMITE_JOURNAL,
  STOCK_VIDE,
  type ChangementStock,
  type FiltresMouvements,
  type Mouvement,
  type NouveauMouvement,
  type Stock,
} from "../modeles/stock.js";
import { StockModifieErreur, type StockRepository } from "./StockRepository.js";

export class MemoireStockRepository implements StockRepository {
  private readonly stocks = new Map<string, Stock>();
  private readonly mouvements: Mouvement[] = [];

  async trouver(produitId: string): Promise<Stock> {
    return { ...(this.stocks.get(produitId) ?? STOCK_VIDE) };
  }

  async trouverPlusieurs(produitIds: string[]): Promise<Map<string, Stock>> {
    return new Map(produitIds.map((id) => [id, { ...(this.stocks.get(id) ?? STOCK_VIDE) }]));
  }

  async enregistrer(produitId: string, avant: Stock, apres: Stock, mouvement?: NouveauMouvement): Promise<void> {
    this.appliquer([{ produitId, avant, apres, ...(mouvement && { mouvement }) }]);
  }

  // Tout ou rien, comme la transaction MongoDB : aucun stock n'est écrit si l'un d'eux a changé.
  appliquer(changements: ChangementStock[]): void {
    for (const { produitId, avant } of changements) {
      const actuel = this.stocks.get(produitId) ?? STOCK_VIDE;
      const inchange =
        actuel.quantitePhysique === avant.quantitePhysique &&
        actuel.quantiteMiseDeCote === avant.quantiteMiseDeCote &&
        actuel.quantiteDefectueuse === avant.quantiteDefectueuse;
      if (!inchange) {
        throw new StockModifieErreur(produitId);
      }
    }
    for (const { produitId, apres, mouvement } of changements) {
      this.stocks.set(produitId, { ...apres });
      if (mouvement) {
        this.mouvements.push({ ...structuredClone(mouvement), id: String(this.mouvements.length + 1) });
      }
    }
  }

  async listerMouvements({ produitId, type }: FiltresMouvements): Promise<Mouvement[]> {
    return this.mouvements
      .filter((m) => (produitId === undefined || m.produitId === produitId) && (type === undefined || m.type === type))
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .slice(0, LIMITE_JOURNAL)
      .map((m) => structuredClone(m));
  }

  async stockInitial(produitId: string): Promise<number | undefined> {
    const premier = this.mouvements
      .filter((m) => m.produitId === produitId)
      .sort((a, b) => a.date.getTime() - b.date.getTime() || Number(a.id) - Number(b.id))[0];
    return premier && (premier.quantiteApres ?? premier.quantite);
  }

  async variationsDepuis(date: Date): Promise<Map<string, number>> {
    const variations = new Map<string, number>();
    for (const m of this.mouvements.filter((m) => m.date.getTime() > date.getTime())) {
      variations.set(m.produitId, (variations.get(m.produitId) ?? 0) + m.quantite);
    }
    return variations;
  }

  async aDesMouvements(produitId: string): Promise<boolean> {
    return this.mouvements.some((m) => m.produitId === produitId);
  }
}
