// RG12 : remboursement, échange (plastique intact) ou remplacement d'un défectueux par un neuf.
export const ISSUES_RETOUR = ["remboursement", "echange", "remplacement"] as const;
export type IssueRetour = (typeof ISSUES_RETOUR)[number];

// Retour d'une quantité d'une ligne de vente (le produit de la ligne). montantRembourse : prix figé × quantité pour un
// remboursement, frais d'options exclus ; pour un échange, la différence en faveur du client. complementPaye : ce que le
// client règle en plus pour un échange plus cher. Jamais modifié ni supprimé.
export interface Retour {
  id: string;
  venteId: string;
  produitId: string;
  reference: string;
  designation: string;
  quantite: number;
  date: Date;
  issue: IssueRetour;
  // L'article rendu peut revenir en stock (stock physique) ; sinon il passe en stock défectueux.
  revendable: boolean;
  // Valeur de l'article rendu : prix unitaire figé × quantité.
  valeur: number;
  montantRembourse: number;
  complementPaye: number;
  // Échange : commande du nouvel article.
  venteEchangeId?: string;
  // Remplacement demandé mais aucun exemplaire neuf disponible : remboursé à la place (RG12).
  remplacementImpossible?: boolean;
}

export type NouveauRetour = Omit<Retour, "id">;

// Écran 9 : pour chaque ligne d'une vente, ce qui a déjà été rendu et ce qui peut encore l'être.
export interface LigneRetournable {
  produitId: string;
  reference: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  quantiteRetournee: number;
  quantiteRetournable: number;
}

export interface RetoursVente {
  venteId: string;
  // RG09 : dernier instant pour rendre un article (fin du jour à Tahiti).
  dateLimiteRetour: Date;
  // false si le délai est passé ou si la commande n'est pas encore expédiée.
  retourPossible: boolean;
  lignes: LigneRetournable[];
  retours: Retour[];
}
