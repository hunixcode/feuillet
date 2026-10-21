import { ErreurApi } from "../erreurs.js";
import { horlogeSysteme, type Horloge } from "../horloge.js";
import {
  TYPES_PRODUIT,
  type EntreePrix,
  type FicheProduit,
  type FiltresProduits,
  type Produit,
  type ProduitCatalogue,
  type TypeProduit,
} from "../modeles/produit.js";
import { ReferenceDejaUtiliseeErreur, type ProduitRepository } from "../repositories/ProduitRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";

const LONGUEUR_MAX_TEXTE = 200;
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MESSAGE_TROP_LONG = `Ce champ ne doit pas dépasser ${LONGUEUR_MAX_TEXTE} caractères.`;
const MESSAGE_TYPE = `Le type doit être : ${TYPES_PRODUIT.join(", ")}.`;

// Champs propres à chaque type (diagramme de classes : Livre, NumeroMagazine, ArticlePapeterie).
const CHAMPS_TEXTE_PAR_TYPE: Record<TypeProduit, readonly ("isbn" | "auteur" | "issn" | "marque")[]> = {
  livre: ["isbn", "auteur"],
  magazine: ["issn"],
  papeterie: ["marque"],
};

function estTypeProduit(valeur: unknown): valeur is TypeProduit {
  return TYPES_PRODUIT.includes(valeur as TypeProduit);
}

function estEntierPositif(valeur: unknown): valeur is number {
  return Number.isInteger(valeur) && (valeur as number) >= 0;
}

// Date.parse accepte « 2026-02-30 » : on vérifie que la date ne déborde pas sur le mois suivant.
function estDateValide(valeur: string): boolean {
  const date = new Date(valeur);
  return FORMAT_DATE.test(valeur) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(valeur);
}

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function validerFiche(corps: unknown): FicheProduit {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};
  const lireTexteObligatoire = (nom: string): string => {
    const valeur = lireTexte(donnees[nom]);
    if (!valeur) {
      champs[nom] = "Ce champ est obligatoire.";
    } else if (valeur.length > LONGUEUR_MAX_TEXTE) {
      champs[nom] = MESSAGE_TROP_LONG;
    }
    return valeur;
  };
  const reference = lireTexteObligatoire("reference");
  const designation = lireTexteObligatoire("designation");
  const categorie = lireTexteObligatoire("categorie");

  const type = donnees.type;
  if (!estTypeProduit(type)) {
    champs.type = MESSAGE_TYPE;
  }
  if (!estEntierPositif(donnees.prix)) {
    champs.prix = "Le prix TTC doit être un nombre entier de XPF, positif ou nul.";
  }
  if (!estEntierPositif(donnees.tauxTva) || donnees.tauxTva > 100) {
    champs.tauxTva = "Le taux de TVA doit être un entier entre 0 et 100.";
  }
  if (donnees.archive !== undefined && typeof donnees.archive !== "boolean") {
    champs.archive = "Archivé doit valoir true ou false.";
  }

  const details: Partial<FicheProduit> = {};
  if (estTypeProduit(type)) {
    for (const nom of CHAMPS_TEXTE_PAR_TYPE[type]) {
      const valeur = lireTexte(donnees[nom]);
      if (valeur.length > LONGUEUR_MAX_TEXTE) {
        champs[nom] = MESSAGE_TROP_LONG;
      } else if (valeur) {
        details[nom] = valeur;
      }
    }
  }
  if (type === "magazine") {
    if (donnees.numero !== undefined) {
      if (estEntierPositif(donnees.numero)) {
        details.numero = donnees.numero;
      } else {
        champs.numero = "Le numéro doit être un entier positif.";
      }
    }
    const dateParution = lireTexte(donnees.dateParution);
    if (dateParution && !estDateValide(dateParution)) {
      champs.dateParution = "La date de parution doit être une date valide au format AAAA-MM-JJ.";
    } else if (dateParution) {
      details.dateParution = dateParution;
    }
  }

  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }

  return {
    reference,
    designation,
    type: type as TypeProduit,
    categorie,
    prix: donnees.prix as number,
    tauxTva: donnees.tauxTva as number,
    archive: donnees.archive === true,
    ...details,
  };
}

function lireFiltres(requete: unknown): FiltresProduits {
  const parametres = lireObjet(requete);
  const filtres: FiltresProduits = { archive: parametres.archive === "true" };

  if (parametres.type !== undefined) {
    if (!estTypeProduit(parametres.type)) {
      throw erreurValidation({ type: MESSAGE_TYPE });
    }
    filtres.type = parametres.type;
  }
  const categorie = lireTexte(parametres.categorie);
  if (categorie) {
    filtres.categorie = categorie;
  }
  return filtres;
}

function erreurIntrouvable(): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", "Produit introuvable.");
}

function traduireErreurReference(erreur: unknown): never {
  if (erreur instanceof ReferenceDejaUtiliseeErreur) {
    throw new ErreurApi(409, "REFERENCE_DEJA_UTILISEE", "Un produit existe déjà avec cette référence.", {
      champs: { reference: "Cette référence est déjà utilisée." },
    });
  }
  throw erreur;
}

function versCatalogue({ historiquePrix: _, ...produit }: Produit): ProduitCatalogue {
  return produit;
}

// shortcut: suppression toujours permise (RG05 : à restreindre aux produits sans historique
// dès que mouvements et ventes existent).
export class ProduitService {
  constructor(
    private readonly produits: ProduitRepository,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  async lister(requete: unknown): Promise<ProduitCatalogue[]> {
    return (await this.produits.lister(lireFiltres(requete))).map(versCatalogue);
  }

  async obtenir(id: string): Promise<ProduitCatalogue> {
    return versCatalogue(await this.trouver(id));
  }

  async historiquePrix(id: string): Promise<EntreePrix[]> {
    return (await this.trouver(id)).historiquePrix;
  }

  async creer(corps: unknown): Promise<ProduitCatalogue> {
    const fiche = validerFiche(corps);
    const historiquePrix = [{ date: this.horloge.maintenant(), prix: fiche.prix }];
    return versCatalogue(await this.produits.creer({ ...fiche, historiquePrix }).catch(traduireErreurReference));
  }

  // RG15 : un changement de prix ajoute une entrée datée ; l'historique existant n'est jamais modifié.
  async modifier(id: string, corps: unknown): Promise<ProduitCatalogue> {
    const fiche = validerFiche(corps);
    const actuel = await this.trouver(id);
    const historiquePrix =
      fiche.prix === actuel.prix
        ? actuel.historiquePrix
        : [...actuel.historiquePrix, { date: this.horloge.maintenant(), prix: fiche.prix }];
    const modifie = await this.produits
      .remplacer({ ...fiche, id, historiquePrix })
      .catch(traduireErreurReference);
    if (!modifie) {
      throw erreurIntrouvable();
    }
    return versCatalogue(modifie);
  }

  async supprimer(id: string): Promise<void> {
    if (!(await this.produits.supprimer(id))) {
      throw erreurIntrouvable();
    }
  }

  private async trouver(id: string): Promise<Produit> {
    const produit = await this.produits.trouverParId(id);
    if (!produit) {
      throw erreurIntrouvable();
    }
    return produit;
  }
}
