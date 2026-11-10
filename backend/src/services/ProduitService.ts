import { randomUUID } from "node:crypto";
import { ErreurApi } from "../erreurs.js";
import { dateDuJour, horlogeSysteme, type Horloge } from "../horloge.js";
import {
  TYPES_PRODUIT,
  type EntreePrix,
  type FicheProduit,
  type FiltresProduits,
  type Produit,
  type ProduitCatalogue,
  type Promotion,
  type TypeProduit,
} from "../modeles/produit.js";
import { quantiteVendable, type Stock } from "../modeles/stock.js";
import type { CategorieRepository } from "../repositories/CategorieRepository.js";
import { ReferenceDejaUtiliseeErreur, type ProduitRepository } from "../repositories/ProduitRepository.js";
import type { StockRepository } from "../repositories/StockRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";

const LONGUEUR_MAX_TEXTE = 200;
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MESSAGE_TROP_LONG = `Ce champ ne doit pas dépasser ${LONGUEUR_MAX_TEXTE} caractères.`;
const MESSAGE_TYPE = `Le type doit être : ${TYPES_PRODUIT.join(", ")}.`;
const MESSAGE_CATEGORIE = "Choisissez une catégorie de la liste.";

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

function validerFiche(corps: unknown, categoriesConnues: string[]): FicheProduit {
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
  const categorie = lireTexte(donnees.categorie);
  if (!categoriesConnues.includes(categorie)) {
    champs.categorie = MESSAGE_CATEGORIE;
  }

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

export function lireFiltres(requete: unknown): FiltresProduits {
  const parametres = lireObjet(requete);
  const filtres: FiltresProduits = { archive: parametres.archive === "true" };

  if (parametres.type !== undefined) {
    if (!estTypeProduit(parametres.type)) {
      throw erreurValidation({ type: MESSAGE_TYPE });
    }
    filtres.type = parametres.type;
  }
  const recherche = lireTexte(parametres.q);
  if (recherche.length > LONGUEUR_MAX_TEXTE) {
    throw erreurValidation({ q: MESSAGE_TROP_LONG });
  }
  if (recherche) {
    filtres.recherche = recherche;
  }
  const categorie = lireTexte(parametres.categorie);
  if (categorie) {
    filtres.categorie = categorie;
  }
  return filtres;
}

function validerPromotion(corps: unknown, aujourdhui: string): Omit<Promotion, "id"> {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};

  const remise = donnees.remise;
  if (!estEntierPositif(remise) || remise < 1 || remise > 100) {
    champs.remise = "La remise doit être un pourcentage entier entre 1 et 100.";
  }
  const debut = lireTexte(donnees.debut);
  if (!estDateValide(debut)) {
    champs.debut = "La date de début doit être une date valide au format AAAA-MM-JJ.";
  }
  const fin = lireTexte(donnees.fin);
  if (!estDateValide(fin)) {
    champs.fin = "La date de fin doit être une date valide au format AAAA-MM-JJ.";
  } else if (fin < debut) {
    champs.fin = "La date de fin doit suivre la date de début.";
  } else if (fin < aujourdhui) {
    champs.fin = "Cette promotion serait déjà terminée.";
  }

  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return { remise: remise as number, debut, fin };
}

function erreurIntrouvable(message = "Produit introuvable."): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", message);
}

function traduireErreurReference(erreur: unknown): never {
  if (erreur instanceof ReferenceDejaUtiliseeErreur) {
    throw new ErreurApi(409, "REFERENCE_DEJA_UTILISEE", "Un produit existe déjà avec cette référence.", {
      champs: { reference: "Cette référence est déjà utilisée." },
    });
  }
  throw erreur;
}

// RG11 : prix appliqué = arrondi(prix TTC × (100 − remise) / 100).
export function prixApplique(prix: number, remise = 0): number {
  return Math.round((prix * (100 - remise)) / 100);
}

export function promotionDuJour({ promotions }: Produit, aujourdhui: string): Promotion | undefined {
  return promotions.find((p) => p.debut <= aujourdhui && aujourdhui <= p.fin);
}

function versCatalogue(produit: Produit, aujourdhui: string, stock: Stock): ProduitCatalogue {
  const { historiquePrix: _, promotions: __, ...fiche } = produit;
  const promotion = promotionDuJour(produit, aujourdhui);
  return {
    ...fiche,
    prixApplique: prixApplique(fiche.prix, promotion?.remise),
    ...(promotion && { promotion }),
    disponibilite: quantiteVendable(stock) > 0 ? "disponible" : "epuise",
  };
}

// shortcut: chaque écriture relit puis remplace le produit entier ; deux modifications simultanées
// du même produit, la dernière gagne (un seul responsable). Passer à des mises à jour ciblées sinon.
// shortcut: RG05 ne regarde que les mouvements (les ventes en créent) ; ajouter demandes et commandes fournisseur.
export class ProduitService {
  constructor(
    private readonly produits: ProduitRepository,
    private readonly categories: CategorieRepository,
    private readonly stocks: StockRepository,
    private readonly horloge: Horloge = horlogeSysteme,
    // RG05 : autres historiques qui empêchent la suppression (demandes, commandes fournisseur).
    private readonly autresHistoriques: ((produitId: string) => Promise<boolean>)[] = [],
  ) {}

  async lister(requete: unknown): Promise<ProduitCatalogue[]> {
    return this.versReponses(await this.produits.lister(lireFiltres(requete)));
  }

  async obtenir(id: string): Promise<ProduitCatalogue> {
    return this.versReponse(await this.trouver(id));
  }

  async historiquePrix(id: string): Promise<EntreePrix[]> {
    return (await this.trouver(id)).historiquePrix;
  }

  async creer(corps: unknown): Promise<ProduitCatalogue> {
    const fiche = validerFiche(corps, await this.identifiantsCategories());
    const historiquePrix = [{ date: this.horloge.maintenant(), prix: fiche.prix }];
    const cree = await this.produits
      .creer({ ...fiche, historiquePrix, promotions: [] })
      .catch(traduireErreurReference);
    return this.versReponse(cree);
  }

  // RG15 : un changement de prix ajoute une entrée datée ; l'historique existant n'est jamais modifié.
  async modifier(id: string, corps: unknown): Promise<ProduitCatalogue> {
    const fiche = validerFiche(corps, await this.identifiantsCategories());
    const actuel = await this.trouver(id);
    const historiquePrix =
      fiche.prix === actuel.prix
        ? actuel.historiquePrix
        : [...actuel.historiquePrix, { date: this.horloge.maintenant(), prix: fiche.prix }];
    const modifie = await this.produits
      .remplacer({ ...fiche, id, historiquePrix, promotions: actuel.promotions })
      .catch(traduireErreurReference);
    if (!modifie) {
      throw erreurIntrouvable();
    }
    return this.versReponse(modifie);
  }

  async supprimer(id: string): Promise<void> {
    if (await this.stocks.aDesMouvements(id)) {
      throw new ErreurApi(
        409,
        "PRODUIT_AVEC_HISTORIQUE",
        "Ce produit a déjà des mouvements de stock : archivez-le plutôt que de le supprimer.",
      );
    }
    for (const aUnHistorique of this.autresHistoriques) {
      if (await aUnHistorique(id)) {
        throw new ErreurApi(
          409,
          "PRODUIT_AVEC_HISTORIQUE",
          "Ce produit a déjà des demandes ou des commandes : archivez-le plutôt que de le supprimer.",
        );
      }
    }
    if (!(await this.produits.supprimer(id))) {
      throw erreurIntrouvable();
    }
  }

  async promotions(id: string): Promise<Promotion[]> {
    return (await this.trouver(id)).promotions.sort((a, b) => a.debut.localeCompare(b.debut));
  }

  // Au plus une promotion active par produit à une date : les périodes ne se chevauchent pas.
  async ajouterPromotion(id: string, corps: unknown): Promise<Promotion> {
    const nouvelle = { id: randomUUID(), ...validerPromotion(corps, dateDuJour(this.horloge)) };
    const produit = await this.trouver(id);
    if (produit.promotions.some((p) => p.debut <= nouvelle.fin && nouvelle.debut <= p.fin)) {
      throw new ErreurApi(409, "PROMOTION_EN_CONFLIT", "Une autre promotion couvre déjà une partie de ces dates.", {
        champs: { debut: "Ces dates chevauchent une autre promotion." },
      });
    }
    await this.enregistrer({ ...produit, promotions: [...produit.promotions, nouvelle] });
    return nouvelle;
  }

  async supprimerPromotion(id: string, promotionId: string): Promise<void> {
    const produit = await this.trouver(id);
    const promotions = produit.promotions.filter((p) => p.id !== promotionId);
    if (promotions.length === produit.promotions.length) {
      throw erreurIntrouvable("Promotion introuvable.");
    }
    await this.enregistrer({ ...produit, promotions });
  }

  private async versReponses(produits: Produit[]): Promise<ProduitCatalogue[]> {
    const aujourdhui = dateDuJour(this.horloge);
    const stocks = await this.stocks.trouverPlusieurs(produits.map((p) => p.id));
    return produits.map((p) => versCatalogue(p, aujourdhui, stocks.get(p.id)!));
  }

  private async versReponse(produit: Produit): Promise<ProduitCatalogue> {
    return (await this.versReponses([produit]))[0]!;
  }

  private async identifiantsCategories(): Promise<string[]> {
    return (await this.categories.lister()).map((c) => c.id);
  }

  private async trouver(id: string): Promise<Produit> {
    const produit = await this.produits.trouverParId(id);
    if (!produit) {
      throw erreurIntrouvable();
    }
    return produit;
  }

  private async enregistrer(produit: Produit): Promise<void> {
    if (!(await this.produits.remplacer(produit))) {
      throw erreurIntrouvable();
    }
  }
}
