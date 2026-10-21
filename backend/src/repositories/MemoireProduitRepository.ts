import type { FiltresProduits, NouveauProduit, Produit } from "../modeles/produit.js";
import { ReferenceDejaUtiliseeErreur, type ProduitRepository } from "./ProduitRepository.js";

export class MemoireProduitRepository implements ProduitRepository {
  private readonly produits = new Map<string, Produit>();
  private prochainId = 1;

  async creer(nouveau: NouveauProduit): Promise<Produit> {
    this.verifierReferenceLibre(nouveau.reference);
    const produit = { ...nouveau, id: String(this.prochainId++) };
    this.produits.set(produit.id, produit);
    return { ...produit };
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
      .map((p) => ({ ...p }));
  }

  async trouverParId(id: string): Promise<Produit | null> {
    const trouve = this.produits.get(id);
    return trouve ? { ...trouve } : null;
  }

  async remplacer(id: string, nouveau: NouveauProduit): Promise<Produit | null> {
    if (!this.produits.has(id)) {
      return null;
    }
    this.verifierReferenceLibre(nouveau.reference, id);
    const produit = { ...nouveau, id };
    this.produits.set(id, produit);
    return { ...produit };
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
