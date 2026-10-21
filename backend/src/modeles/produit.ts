export const TYPES_PRODUIT = ["livre", "magazine", "papeterie"] as const;
export type TypeProduit = (typeof TYPES_PRODUIT)[number];

export interface Produit {
  id: string;
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

export type NouveauProduit = Omit<Produit, "id">;

export interface FiltresProduits {
  type?: TypeProduit;
  categorie?: string;
  archive: boolean;
}
