export const TYPES_PRODUIT = ["livre", "magazine", "papeterie"] as const;
export type TypeProduit = (typeof TYPES_PRODUIT)[number];

// Rayons qui guident le client (rapport.md, vocabulaire) : liste fixe.
export const CATEGORIES = [
  { id: "roman", libelle: "Roman" },
  { id: "policier", libelle: "Policier" },
  { id: "bd-manga", libelle: "BD et manga" },
  { id: "jeunesse", libelle: "Jeunesse" },
  { id: "documentaire", libelle: "Documentaire" },
  { id: "scolaire", libelle: "Scolaire" },
  { id: "presse", libelle: "Presse" },
  { id: "fournitures", libelle: "Fournitures" },
] as const;

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

// shortcut: recherche sensible aux accents (« ile » ne trouve pas « Île ») ; normaliser un champ dédié si besoin.
export const CHAMPS_RECHERCHE = ["designation", "reference", "auteur", "isbn", "issn", "marque"] as const;

export interface FiltresProduits {
  type?: TypeProduit;
  categorie?: string;
  recherche?: string;
  archive: boolean;
}
