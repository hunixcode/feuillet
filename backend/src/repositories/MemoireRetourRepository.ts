import type { NouveauRetour, Retour } from "../modeles/retour.js";
import type { ChangementStock } from "../modeles/stock.js";
import type { MemoireStockRepository } from "./MemoireStockRepository.js";
import type { RetourRepository } from "./RetourRepository.js";

export class MemoireRetourRepository implements RetourRepository {
  private readonly retours: Retour[] = [];

  constructor(private readonly stocks: MemoireStockRepository) {}

  async creer(nouveau: NouveauRetour, changement: ChangementStock): Promise<Retour> {
    const id = String(this.retours.length + 1);
    this.stocks.appliquer([
      { ...changement, ...(changement.mouvement && { mouvement: { ...changement.mouvement, retourId: id } }) },
    ]);
    const retour = { ...structuredClone(nouveau), id };
    this.retours.push(retour);
    return structuredClone(retour);
  }

  async listerDeVente(venteId: string): Promise<Retour[]> {
    return this.retours.filter((r) => r.venteId === venteId).map((r) => structuredClone(r));
  }

  async listerPeriode(debut: Date, fin: Date): Promise<Retour[]> {
    return this.retours
      .filter((r) => r.date.getTime() >= debut.getTime() && r.date.getTime() <= fin.getTime())
      .map((r) => structuredClone(r));
  }
}
