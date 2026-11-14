import type { NouveauRetour, Retour } from "../modeles/retour.js";
import type { ChangementStock } from "../modeles/stock.js";

export interface RetourRepository {
  // Enregistre le retour et son changement de stock (un mouvement qui reçoit l'identifiant du retour), tout ou rien ;
  // StockModifieErreur si le stock n'est plus `avant`.
  creer(retour: NouveauRetour, changement: ChangementStock): Promise<Retour>;
  // Du plus ancien au plus récent.
  listerDeVente(venteId: string): Promise<Retour[]>;
  // Retours datés entre debut et fin inclus.
  listerPeriode(debut: Date, fin: Date): Promise<Retour[]>;
}
