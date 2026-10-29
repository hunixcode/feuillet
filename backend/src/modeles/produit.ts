export const TYPES_PRODUIT = ["livre", "magazine", "papeterie"] as const;
export type TypeProduit = (typeof TYPES_PRODUIT)[number];

export interface FicheProduit {
  reference: string;
  designation: string;
  type: TypeProduit;
  categorie: string;
  prix: number;
  tauxTva: number;
  archive: boolean;
  isbn?: string;
  auteur?: string;
  issn?: string;
  numero?: number;
  dateParution?: string;
  marque?: string;
}

export interface EntreePrix {
  date: Date;
  prix: number;
}

// Remise en % valable du jour de début au jour de fin inclus (dates AAAA-MM-JJ).
export interface Promotion {
  id: string;
  remise: number;
  debut: string;
  fin: string;
}

export interface Produit extends FicheProduit {
  id: string;
  historiquePrix: EntreePrix[];
  promotions: Promotion[];
}

export type NouveauProduit = Omit<Produit, "id">;

// Ce que voit le catalogue : la fiche, le prix appliqué (RG11) et la promotion du jour, sans les historiques.
export type ProduitCatalogue = FicheProduit & {
  id: string;
  prixApplique: number;
  promotion?: Promotion;
  disponibilite: "disponible" | "epuise";
};

// shortcut: recherche sensible aux accents (« ile » ne trouve pas « Île ») ; normaliser un champ dédié si besoin.
export const CHAMPS_RECHERCHE = ["designation", "reference", "auteur", "isbn", "issn", "marque"] as const;

export interface FiltresProduits {
  type?: TypeProduit;
  categorie?: string;
  recherche?: string;
  archive: boolean;
}
