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

export interface Produit extends FicheProduit {
  id: string;
  historiquePrix: EntreePrix[];
}

export type NouveauProduit = Omit<Produit, "id">;

// Ce que voit le catalogue : la fiche, sans l'historique (réservé au responsable, EX11).
export type ProduitCatalogue = FicheProduit & { id: string };

export interface FiltresProduits {
  type?: TypeProduit;
  categorie?: string;
  archive: boolean;
}
