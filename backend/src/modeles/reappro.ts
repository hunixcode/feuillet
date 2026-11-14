export interface Fournisseur {
  id: string;
  nom: string;
  contact?: string;
}

export type NouveauFournisseur = Omit<Fournisseur, "id">;

// en_cours → partiellement_recue → recue.
export const STATUTS_COMMANDE_FOURNISSEUR = ["en_cours", "partiellement_recue", "recue"] as const;
export type StatutCommandeFournisseur = (typeof STATUTS_COMMANDE_FOURNISSEUR)[number];

// Décision 19 : une commande fournisseur = un fournisseur et un produit. Fournisseur, référence et désignation
// sont gardés pour l'affichage. quantiteRecue : total des réceptions validées.
export interface CommandeFournisseur {
  id: string;
  fournisseur: { id: string; nom: string };
  produitId: string;
  reference: string;
  designation: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  date: Date;
  // AAAA-MM-JJ, jour de Tahiti.
  dateArriveePrevue: string;
  statut: StatutCommandeFournisseur;
  // Date de la réception qui a complété la commande (RG10 : dernière commande reçue).
  dateReceptionComplete?: Date;
}

export type NouvelleCommandeFournisseur = Omit<CommandeFournisseur, "id">;

// Une réception est saisie puis validée ; seule la validation fait entrer le stock (RG07 : une seule fois).
// Décision 20 : les articles abîmés à la livraison ne sont pas comptés comme reçus.
export interface Reception {
  id: string;
  commandeId: string;
  produitId: string;
  date: Date;
  quantiteRecue: number;
  quantiteAbimee: number;
  validee: boolean;
  dateValidation?: Date;
}

export type NouvelleReception = Omit<Reception, "id">;

export function restantARecevoir({ quantiteCommandee, quantiteRecue }: CommandeFournisseur): number {
  return quantiteCommandee - quantiteRecue;
}

export function statutCommande(quantiteCommandee: number, quantiteRecue: number): StatutCommandeFournisseur {
  if (quantiteRecue >= quantiteCommandee) {
    return "recue";
  }
  return quantiteRecue > 0 ? "partiellement_recue" : "en_cours";
}

// shortcut: les listes renvoient les 500 commandes les plus récentes ; paginer quand l'historique grossira.
export const LIMITE_COMMANDES_FOURNISSEUR = 500;

export interface FiltresCommandesFournisseur {
  statut?: StatutCommandeFournisseur;
  produitId?: string;
  fournisseurId?: string;
}

// État de la commande avant et après la validation d'une réception : l'écriture échoue si elle a changé entre-temps.
export interface ChangementCommande {
  commandeId: string;
  quantiteRecueAvant: number;
  quantiteRecue: number;
  statut: StatutCommandeFournisseur;
  dateReceptionComplete?: Date;
}

// RG10 : vendable ≤ seuil (%) × quantité achetée à l'origine.
export interface ProduitARecommander {
  produitId: string;
  reference: string;
  designation: string;
  quantiteVendable: number;
  quantiteAcheteeOrigine: number;
  seuilAlerte: number;
  // Part de la quantité achetée à l'origine qui n'est plus vendable, en %.
  pourcentageVendu: number;
  // Restant à recevoir des commandes fournisseur en cours.
  quantiteEnCommande: number;
}
