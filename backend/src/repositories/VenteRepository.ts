import type { ChangementStock } from "../modeles/stock.js";
import type { FiltresVentes, NouvelleVente, Vente } from "../modeles/vente.js";

export interface VenteRepository {
  // Enregistre la vente et les changements de stock de ses lignes, tout ou rien ; chaque mouvement reçoit
  // l'identifiant de la vente. StockModifieErreur si l'un des stocks n'est plus `avant`.
  // demandesHonorees : mises de côté du client consommées par la vente, passées à honoree dans la même transaction.
  creer(vente: NouvelleVente, changements: ChangementStock[], demandesHonorees?: string[]): Promise<Vente>;
  lister(filtres: FiltresVentes): Promise<Vente[]>;
  trouverParId(id: string): Promise<Vente | null>;
  // Passe une commande de a_preparer à expediee ; null si elle n'est pas (ou plus) à préparer.
  marquerExpediee(id: string, date: Date): Promise<Vente | null>;
}
