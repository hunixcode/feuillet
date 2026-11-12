import type { PlanMisesDeCote } from "../modeles/demande.js";
import type {
  ChangementCommande,
  CommandeFournisseur,
  FiltresCommandesFournisseur,
  Fournisseur,
  NouveauFournisseur,
  NouvelleCommandeFournisseur,
  NouvelleReception,
  Reception,
} from "../modeles/reappro.js";
import type { ChangementStock } from "../modeles/stock.js";

export class ReceptionDejaValideeErreur extends Error {
  constructor(receptionId: string) {
    super(`La réception ${receptionId} est déjà validée`);
    this.name = "ReceptionDejaValideeErreur";
  }
}

export class CommandeModifieeErreur extends Error {
  constructor(commandeId: string) {
    super(`La commande fournisseur ${commandeId} a changé entre-temps`);
    this.name = "CommandeModifieeErreur";
  }
}

export interface FournisseurRepository {
  creer(fournisseur: NouveauFournisseur): Promise<Fournisseur>;
  // null si le fournisseur n'existe pas.
  remplacer(fournisseur: Fournisseur): Promise<Fournisseur | null>;
  // Par nom.
  lister(): Promise<Fournisseur[]>;
  trouverParId(id: string): Promise<Fournisseur | null>;
}

export interface CommandeFournisseurRepository {
  creer(commande: NouvelleCommandeFournisseur): Promise<CommandeFournisseur>;
  trouverParId(id: string): Promise<CommandeFournisseur | null>;
  // Du plus récent au plus ancien.
  lister(filtres: FiltresCommandesFournisseur): Promise<CommandeFournisseur[]>;
  // Commandes pas encore entièrement reçues des produits donnés.
  enCours(produitIds: string[]): Promise<CommandeFournisseur[]>;
  // RG10 : la commande du produit entièrement reçue le plus récemment.
  derniereRecue(produitId: string): Promise<CommandeFournisseur | null>;
  aDesCommandes(produitId: string): Promise<boolean>;
  creerReception(reception: NouvelleReception): Promise<Reception>;
  trouverReception(id: string): Promise<Reception | null>;
  // De la plus récente à la plus ancienne.
  listerReceptions(commandeId: string): Promise<Reception[]>;
  // Diagramme de séquence de la réception, dans une transaction : marque la réception validée, met à jour la commande,
  // fait entrer le stock (changement avant → plan.stockApres, mouvement entree) et applique les mises de côté.
  // ReceptionDejaValideeErreur, CommandeModifieeErreur ou StockModifieErreur : rien n'est écrit.
  validerReception(
    receptionId: string,
    date: Date,
    commande: ChangementCommande,
    changement: ChangementStock,
    plan: PlanMisesDeCote,
  ): Promise<void>;
}

// RG10 : seuil d'alerte (%) propre à un produit ; sans réglage, le seuil par défaut des paramètres s'applique.
export interface SeuilAlerteRepository {
  seuils(produitIds: string[]): Promise<Map<string, number>>;
  // null : revenir au seuil par défaut.
  definir(produitId: string, seuil: number | null): Promise<void>;
}
