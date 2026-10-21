import { ErreurApi } from "../erreurs.js";
import type { Categorie } from "../modeles/categorie.js";
import { CategorieDejaExistanteErreur, type CategorieRepository } from "../repositories/CategorieRepository.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import { erreurValidation, lireObjet } from "../validation.js";

const LONGUEUR_MAX_LIBELLE = 100;

// Identifiant stable tiré du libellé à la création (« BD et manga » → « bd-et-manga ») : un renommage
// ne change ni les produits rattachés ni les adresses filtrées par catégorie.
export function versIdentifiant(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validerLibelle(corps: unknown): string {
  const valeur = lireObjet(corps).libelle;
  const libelle = typeof valeur === "string" ? valeur.trim() : "";
  if (!versIdentifiant(libelle)) {
    throw erreurValidation({ libelle: "Le libellé doit contenir au moins une lettre ou un chiffre." });
  }
  if (libelle.length > LONGUEUR_MAX_LIBELLE) {
    throw erreurValidation({ libelle: `Le libellé ne doit pas dépasser ${LONGUEUR_MAX_LIBELLE} caractères.` });
  }
  return libelle;
}

function erreurDejaExistante(): ErreurApi {
  return new ErreurApi(409, "CATEGORIE_DEJA_EXISTANTE", "Une catégorie porte déjà ce nom.", {
    champs: { libelle: "Une catégorie porte déjà ce nom." },
  });
}

function erreurIntrouvable(): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", "Catégorie introuvable.");
}

export class CategorieService {
  constructor(
    private readonly categories: CategorieRepository,
    private readonly produits: ProduitRepository,
  ) {}

  lister(): Promise<Categorie[]> {
    return this.categories.lister();
  }

  async creer(corps: unknown): Promise<Categorie> {
    const libelle = validerLibelle(corps);
    const id = versIdentifiant(libelle);
    await this.verifierNomLibre(id);
    return this.categories.creer({ id, libelle }).catch((erreur: unknown) => {
      throw erreur instanceof CategorieDejaExistanteErreur ? erreurDejaExistante() : erreur;
    });
  }

  async renommer(id: string, corps: unknown): Promise<Categorie> {
    const libelle = validerLibelle(corps);
    await this.verifierNomLibre(versIdentifiant(libelle), id);
    const renommee = await this.categories.renommer(id, libelle);
    if (!renommee) {
      throw erreurIntrouvable();
    }
    return renommee;
  }

  async supprimer(id: string): Promise<void> {
    if (await this.produits.utiliseCategorie(id)) {
      throw new ErreurApi(
        409,
        "CATEGORIE_UTILISEE",
        "Des produits utilisent cette catégorie : changez-les de catégorie avant de la supprimer.",
      );
    }
    if (!(await this.categories.supprimer(id))) {
      throw erreurIntrouvable();
    }
  }

  // Deux catégories ne portent pas le même nom, à la casse et aux accents près, ni le nom d'un identifiant existant.
  private async verifierNomLibre(identifiant: string, idExclu?: string): Promise<void> {
    const existantes = await this.categories.lister();
    const prise = existantes.some(
      (c) => c.id !== idExclu && (c.id === identifiant || versIdentifiant(c.libelle) === identifiant),
    );
    if (prise) {
      throw erreurDejaExistante();
    }
  }
}
