import type { FiltresProduits, NouveauProduit, Produit } from "../modeles/produit.js";

export class ReferenceDejaUtiliseeErreur extends Error {
  constructor(reference: string) {
    super(`La référence ${reference} est déjà utilisée`);
    this.name = "ReferenceDejaUtiliseeErreur";
  }
}

export interface ProduitRepository {
  creer(produit: NouveauProduit): Promise<Produit>;
  lister(filtres: FiltresProduits): Promise<Produit[]>;
  trouverParId(id: string): Promise<Produit | null>;
  remplacer(id: string, produit: NouveauProduit): Promise<Produit | null>;
  supprimer(id: string): Promise<boolean>;
}
