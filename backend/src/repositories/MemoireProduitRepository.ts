import type { FiltresProduits, NouveauProduit, Produit } from "../modeles/produit.js";
import { ReferenceDejaUtiliseeErreur, type ProduitRepository } from "./ProduitRepository.js";

export class MemoireProduitRepository implements ProduitRepository {
  private readonly produits = new Map<string, Produit>();
  private prochainId = 1;

  async creer(nouveau: NouveauProduit): Promise<Produit> {
    this.verifierReferenceLibre(nouveau.reference);
    const produit = { ...structuredClone(nouveau), id: String(this.prochainId++) };
    this.produits.set(produit.id, produit);
    return structuredClone(produit);
  }

  async lister({ type, categorie, archive }: FiltresProduits): Promise<Produit[]> {
    return [...this.produits.values()]
      .filter(
        (p) =>
          p.archive === archive &&
          (type === undefined || p.type === type) &&
          (categorie === undefined || p.categorie === categorie),
      )
      .sort((a, b) => a.designation.localeCompare(b.designation))
      .map((p) => structuredClone(p));
  }

  async trouverParId(id: string): Promise<Produit | null> {
    const trouve = this.produits.get(id);
    return trouve ? structuredClone(trouve) : null;
  }

  async remplacer(produit: Produit): Promise<Produit | null> {
    if (!this.produits.has(produit.id)) {
      return null;
    }
    this.verifierReferenceLibre(produit.reference, produit.id);
    this.produits.set(produit.id, structuredClone(produit));
    return structuredClone(produit);
  }

  async supprimer(id: string): Promise<boolean> {
    return this.produits.delete(id);
  }

  private verifierReferenceLibre(reference: string, idExclu?: string): void {
    for (const p of this.produits.values()) {
      if (p.reference === reference && p.id !== idExclu) {
        throw new ReferenceDejaUtiliseeErreur(reference);
      }
    }
  }
}
