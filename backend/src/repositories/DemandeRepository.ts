import type { Demande, FiltresDemandes, NouvelleDemande, PlanMisesDeCote } from "../modeles/demande.js";
import type { ChangementStock } from "../modeles/stock.js";

export interface DemandeRepository {
  creer(demande: NouvelleDemande): Promise<Demande>;
  trouverParId(id: string): Promise<Demande | null>;
  // Du plus récent au plus ancien.
  lister(filtres: FiltresDemandes): Promise<Demande[]>;
  // Demandes en attente d'un produit, par ordre d'arrivée.
  enAttente(produitId: string): Promise<Demande[]>;
  misesDeCoteDuClient(clientId: string, produitIds: string[]): Promise<Demande[]>;
  // Mises de côté dont la date limite (dernier instant valable) est passée.
  misesDeCoteEchues(date: Date): Promise<Demande[]>;
  // null si la demande n'est pas (ou plus) en attente.
  annuler(id: string, date: Date): Promise<Demande | null>;
  // null si la demande n'est pas (ou plus) une demande hors catalogue en attente.
  rattacher(id: string, produitId: string): Promise<Demande | null>;
  aDesDemandes(produitId: string): Promise<boolean>;
  // Libère la mise de côté et passe la demande à expiree, tout ou rien ; false si le stock ou la demande a changé.
  expirer(id: string, changement: ChangementStock, date: Date): Promise<boolean>;
  // Applique le changement de stock (avant → plan.stockApres), les mises de côté et les notifications, tout ou rien ;
  // StockModifieErreur si le stock n'est plus `avant`.
  mettreDeCote(changement: ChangementStock, plan: PlanMisesDeCote): Promise<void>;
}
