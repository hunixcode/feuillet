import type { Categorie } from "../modeles/categorie.js";
import { CategorieDejaExistanteErreur, type CategorieRepository } from "./CategorieRepository.js";

export class MemoireCategorieRepository implements CategorieRepository {
  private readonly categories = new Map<string, Categorie>();

  async lister(): Promise<Categorie[]> {
    return [...this.categories.values()]
      .sort((a, b) => a.libelle.localeCompare(b.libelle))
      .map((c) => ({ ...c }));
  }

  async trouverParId(id: string): Promise<Categorie | null> {
    const trouvee = this.categories.get(id);
    return trouvee ? { ...trouvee } : null;
  }

  async creer(categorie: Categorie): Promise<Categorie> {
    if (this.categories.has(categorie.id)) {
      throw new CategorieDejaExistanteErreur(categorie.id);
    }
    this.categories.set(categorie.id, { ...categorie });
    return { ...categorie };
  }

  async renommer(id: string, libelle: string): Promise<Categorie | null> {
    if (!this.categories.has(id)) {
      return null;
    }
    this.categories.set(id, { id, libelle });
    return { id, libelle };
  }

  async supprimer(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }
}
