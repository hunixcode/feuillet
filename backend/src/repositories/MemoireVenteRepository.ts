import type { ChangementStock } from "../modeles/stock.js";
import { LIMITE_VENTES, type FiltresVentes, type NouvelleVente, type Vente } from "../modeles/vente.js";
import type { MemoireStockRepository } from "./MemoireStockRepository.js";
import type { VenteRepository } from "./VenteRepository.js";

export class MemoireVenteRepository implements VenteRepository {
  private readonly ventes = new Map<string, Vente>();
  private prochainId = 1;

  constructor(private readonly stocks: MemoireStockRepository) {}

  async creer(nouvelle: NouvelleVente, changements: ChangementStock[]): Promise<Vente> {
    const id = String(this.prochainId);
    this.stocks.appliquer(
      changements.map((c) => ({ ...c, ...(c.mouvement && { mouvement: { ...c.mouvement, venteId: id } }) })),
    );
    this.prochainId++;
    const vente = { ...structuredClone(nouvelle), id };
    this.ventes.set(id, vente);
    return structuredClone(vente);
  }

  async lister({ canal, statut, clientId }: FiltresVentes): Promise<Vente[]> {
    return [...this.ventes.values()]
      .filter(
        (v) =>
          (canal === undefined || v.canal === canal) &&
          (statut === undefined || v.statut === statut) &&
          (clientId === undefined || v.client?.id === clientId),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .slice(0, LIMITE_VENTES)
      .map((v) => structuredClone(v));
  }

  async trouverParId(id: string): Promise<Vente | null> {
    const vente = this.ventes.get(id);
    return vente ? structuredClone(vente) : null;
  }

  async marquerRemise(id: string, date: Date): Promise<Vente | null> {
    const vente = this.ventes.get(id);
    if (!vente || vente.statut !== "a_preparer") {
      return null;
    }
    vente.statut = "remise";
    vente.dateRemise = date;
    return structuredClone(vente);
  }
}
