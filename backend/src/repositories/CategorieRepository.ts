import type { Categorie } from "../modeles/categorie.js";

export class CategorieDejaExistanteErreur extends Error {
  constructor(id: string) {
    super(`La catégorie ${id} existe déjà`);
    this.name = "CategorieDejaExistanteErreur";
  }
}

export interface CategorieRepository {
  lister(): Promise<Categorie[]>;
  trouverParId(id: string): Promise<Categorie | null>;
  creer(categorie: Categorie): Promise<Categorie>;
  renommer(id: string, libelle: string): Promise<Categorie | null>;
  supprimer(id: string): Promise<boolean>;
}
