export const TYPES_MOUVEMENT = ["entree", "vente", "retour", "remplacement", "ajustement"] as const;
export type TypeMouvement = (typeof TYPES_MOUVEMENT)[number];

export const OPERATEURS = ["responsable", "client", "systeme"] as const;
export type Operateur = (typeof OPERATEURS)[number];

export interface Stock {
  quantitePhysique: number;
  quantiteMiseDeCote: number;
  quantiteDefectueuse: number;
}

export const STOCK_VIDE: Stock = { quantitePhysique: 0, quantiteMiseDeCote: 0, quantiteDefectueuse: 0 };

// RG04 : stock vendable = physique − mis de côté, jamais négatif ; le défectueux est compté à part.
export function quantiteVendable({ quantitePhysique, quantiteMiseDeCote }: Stock): number {
  return Math.max(0, quantitePhysique - quantiteMiseDeCote);
}

// quantite : variation du stock physique (négative pour une sortie). Un ajustement garde l'avant et l'après.
export interface Mouvement {
  id: string;
  produitId: string;
  date: Date;
  type: TypeMouvement;
  quantite: number;
  motif: string;
  operateur: Operateur;
  quantiteAvant?: number;
  quantiteApres?: number;
}

export type NouveauMouvement = Omit<Mouvement, "id">;

// shortcut: le journal renvoie les 500 mouvements les plus récents ; paginer quand l'historique grossira.
export const LIMITE_JOURNAL = 500;

export interface FiltresMouvements {
  produitId?: string;
  type?: TypeMouvement;
}
