import type { ChangementStock } from "../modeles/stock.js";
import { LIMITE_VENTES, type FiltresVentes, type NouvelleVente, type Vente } from "../modeles/vente.js";
import { MemoireDemandeRepository } from "./MemoireDemandeRepository.js";
import type { MemoireStockRepository } from "./MemoireStockRepository.js";
import { StockModifieErreur } from "./StockRepository.js";
import type { VenteRepository } from "./VenteRepository.js";

export class MemoireVenteRepository implements VenteRepository {
  private readonly ventes = new Map<string, Vente>();
  private prochainId = 1;

  constructor(
    private readonly stocks: MemoireStockRepository,
    private readonly demandes = new MemoireDemandeRepository(stocks),
  ) {}

  async creer(nouvelle: NouvelleVente, changements: ChangementStock[], demandesHonorees: string[] = []): Promise<Vente> {
    const id = String(this.prochainId);
    if (!this.demandes.sontMisesDeCote(demandesHonorees)) {
      throw new StockModifieErreur(changements[0]?.produitId ?? "");
    }
    this.stocks.appliquer(
      changements.map((c) => ({ ...c, ...(c.mouvement && { mouvement: { ...c.mouvement, venteId: id } }) })),
    );
    this.demandes.honorer(demandesHonorees, nouvelle.date);
    this.prochainId++;
    const vente = { ...structuredClone(nouvelle), id };
    this.ventes.set(id, vente);
    return structuredClone(vente);
  }

  async lister({ statut, clientId }: FiltresVentes): Promise<Vente[]> {
    return [...this.ventes.values()]
      .filter(
        (v) =>
          (statut === undefined || v.statut === statut) &&
          (clientId === undefined || v.client.id === clientId),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .slice(0, LIMITE_VENTES)
      .map((v) => structuredClone(v));
  }

  async trouverParId(id: string): Promise<Vente | null> {
    const vente = this.ventes.get(id);
    return vente ? structuredClone(vente) : null;
  }

  async marquerExpediee(id: string, date: Date): Promise<Vente | null> {
    const vente = this.ventes.get(id);
    if (!vente || vente.statut !== "a_preparer") {
      return null;
    }
    vente.statut = "expediee";
    vente.dateExpedition = date;
    return structuredClone(vente);
  }
}
