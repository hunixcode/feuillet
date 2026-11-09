export const CANAUX_VENTE = ["en_ligne", "comptoir"] as const;
export type CanalVente = (typeof CANAUX_VENTE)[number];

// Commande en ligne : a_preparer → remise. Une vente au comptoir est remise tout de suite.
export const STATUTS_VENTE = ["a_preparer", "remise"] as const;
export type StatutVente = (typeof STATUTS_VENTE)[number];

export const OCCASIONS_CADEAU = ["noel", "anniversaire", "fete"] as const;
export type OccasionCadeau = (typeof OCCASIONS_CADEAU)[number];

// Ce que le panier envoie : le produit et la quantité, jamais le prix.
export interface LigneCommande {
  produitId: string;
  quantite: number;
}

// RG02 : prix appliqué, remise et TVA du jour de la vente, figés ; désignation et référence gardées pour l'affichage.
export interface LigneVente extends LigneCommande {
  reference: string;
  designation: string;
  prixUnitaire: number;
  remise: number;
  tauxTva: number;
  montant: number;
  montantTva: number;
}

// Montants en XPF entiers, calculés par le back : le front affiche ce qu'il reçoit.
export interface Montants {
  sousTotal: number;
  fraisEmballage: number;
  fraisLivraison: number;
  frais: number;
  montantTva: number;
  total: number;
}

export interface OptionsVente {
  occasionCadeau?: OccasionCadeau;
  emballageCadeau: boolean;
  adresseLivraison?: string;
}

export interface ClientVente {
  id: string;
  nom: string;
  email: string;
}

export interface Vente extends OptionsVente, Montants {
  id: string;
  date: Date;
  canal: CanalVente;
  statut: StatutVente;
  client?: ClientVente;
  lignes: LigneVente[];
  dateRemise?: Date;
}

export type NouvelleVente = Omit<Vente, "id">;

// shortcut: les listes renvoient les 500 ventes les plus récentes ; paginer quand l'historique grossira.
export const LIMITE_VENTES = 500;

export interface FiltresVentes {
  canal?: CanalVente;
  statut?: StatutVente;
  clientId?: string;
}
