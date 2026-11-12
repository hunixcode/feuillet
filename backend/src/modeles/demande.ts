import type { Stock } from "./stock.js";

// en_attente → mise_de_cote → honoree ; mise_de_cote → expiree (décision 18) ; en_attente → annulee (par le client).
export const STATUTS_DEMANDE = ["en_attente", "mise_de_cote", "honoree", "expiree", "annulee"] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];

export interface ClientDemande {
  id: string;
  nom: string;
  email: string;
}

export interface MiseDeCote {
  quantite: number;
  dateLimite: Date;
}

// Une demande vise soit un produit du catalogue (produitId), soit un livre absent du catalogue (titre seul).
// Le titre est toujours rempli : désignation du produit, ou titre saisi par le client.
export interface Demande {
  id: string;
  client: ClientDemande;
  produitId?: string;
  titre: string;
  auteur?: string;
  isbn?: string;
  quantiteSouhaitee: number;
  date: Date;
  statut: StatutDemande;
  miseDeCote?: MiseDeCote;
  // Date du passage à honoree, expiree ou annulee.
  dateFin?: Date;
}

export type NouvelleDemande = Omit<Demande, "id">;

// shortcut: les listes renvoient les 500 demandes les plus récentes ; paginer quand l'historique grossira.
export const LIMITE_DEMANDES = 500;

export interface FiltresDemandes {
  clientId?: string;
  statut?: StatutDemande;
  produitId?: string;
}

export const TYPES_NOTIFICATION = ["reapprovisionnement"] as const;
export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

// Unique par (client, produit, type) : un client n'est prévenu qu'une fois pour un même produit.
export interface Notification {
  id: string;
  clientId: string;
  produitId: string;
  type: TypeNotification;
  date: Date;
  message: string;
  lue: boolean;
}

export type NouvelleNotification = Omit<Notification, "id">;

// Ce qu'une entrée en stock déclenche (diagramme de séquence de la réception) : les demandes en attente
// mises de côté et les clients prévenus, avec le stock du produit qui en résulte. Appliqué tout ou rien.
export interface PlanMisesDeCote {
  produitId: string;
  stockApres: Stock;
  misesDeCote: { demandeId: string; miseDeCote: MiseDeCote }[];
  notifications: NouvelleNotification[];
}
