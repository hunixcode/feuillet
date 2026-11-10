import { ErreurApi } from "../erreurs.js";
import { horlogeSysteme, type Horloge } from "../horloge.js";
import {
  TYPES_MOUVEMENT,
  quantiteVendable,
  type Mouvement,
  type NouveauMouvement,
  type Stock,
  type TypeMouvement,
} from "../modeles/stock.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import { StockModifieErreur, type StockRepository } from "../repositories/StockRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";
import { lireFiltres } from "./ProduitService.js";

const LONGUEUR_MAX_MOTIF = 200;

export type EtatStock = Stock & { produitId: string; quantiteVendable: number };
export type LigneStock = EtatStock & { reference: string; designation: string };

function versEtat(produitId: string, stock: Stock): EtatStock {
  return { produitId, ...stock, quantiteVendable: quantiteVendable(stock) };
}

function lireQuantite(corps: unknown, nom: string, minimum: number): { quantite: number; motif: string } {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};
  const quantite = donnees[nom];
  if (!Number.isInteger(quantite) || (quantite as number) < minimum) {
    champs[nom] = `La quantité doit être un nombre entier${minimum > 0 ? " positif" : ", positif ou nul"}.`;
  }
  const motif = typeof donnees.motif === "string" ? donnees.motif.trim() : "";
  if (!motif) {
    champs.motif = "Le motif est obligatoire.";
  } else if (motif.length > LONGUEUR_MAX_MOTIF) {
    champs.motif = `Le motif ne doit pas dépasser ${LONGUEUR_MAX_MOTIF} caractères.`;
  }
  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return { quantite: quantite as number, motif };
}

function erreurInsuffisant(message: string): ErreurApi {
  return new ErreurApi(409, "STOCK_INSUFFISANT", message, { champs: { quantite: message } });
}

export class StockService {
  constructor(
    private readonly stocks: StockRepository,
    private readonly produits: ProduitRepository,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  async lister(requete: unknown): Promise<LigneStock[]> {
    const produits = await this.produits.lister(lireFiltres(requete));
    const stocks = await this.stocks.trouverPlusieurs(produits.map((p) => p.id));
    return produits.map(({ id, reference, designation }) => ({
      ...versEtat(id, stocks.get(id)!),
      reference,
      designation,
    }));
  }

  async obtenir(produitId: string): Promise<EtatStock> {
    await this.verifierProduit(produitId);
    return versEtat(produitId, await this.stocks.trouver(produitId));
  }

  async mouvements(requete: unknown): Promise<Mouvement[]> {
    const parametres = lireObjet(requete);
    const type = parametres.type;
    if (type !== undefined && !TYPES_MOUVEMENT.includes(type as TypeMouvement)) {
      throw erreurValidation({ type: `Le type doit être : ${TYPES_MOUVEMENT.join(", ")}.` });
    }
    return this.stocks.listerMouvements({
      ...(typeof parametres.produit === "string" && parametres.produit && { produitId: parametres.produit }),
      ...(type !== undefined && { type: type as TypeMouvement }),
    });
  }

  // EX02 : la correction garde la quantité avant et après le comptage. RG04 : jamais sous les quantités mises de côté.
  async corrigerInventaire(produitId: string, corps: unknown): Promise<EtatStock> {
    const { quantite: comptee, motif } = lireQuantite(corps, "quantiteComptee", 0);
    return this.modifier(produitId, (avant) => {
      if (comptee < avant.quantiteMiseDeCote) {
        throw new ErreurApi(
          409,
          "STOCK_INSUFFISANT",
          `${avant.quantiteMiseDeCote} exemplaires sont mis de côté : le stock compté ne peut pas être inférieur.`,
          { champs: { quantiteComptee: "Inférieur aux exemplaires mis de côté." } },
        );
      }
      return {
        apres: { ...avant, quantitePhysique: comptee },
        mouvement: this.ajustement(produitId, avant.quantitePhysique, comptee, motif),
      };
    });
  }

  // Article abîmé en magasin : ajustement du stock physique vers le stock défectueux (décision 9 du rapport).
  async declarerDefectueux(produitId: string, corps: unknown): Promise<EtatStock> {
    const { quantite, motif } = lireQuantite(corps, "quantite", 1);
    return this.modifier(produitId, (avant) => {
      if (quantite > quantiteVendable(avant)) {
        throw erreurInsuffisant(`Seuls ${quantiteVendable(avant)} exemplaires vendables peuvent être déclarés abîmés.`);
      }
      const physique = avant.quantitePhysique - quantite;
      return {
        apres: { ...avant, quantitePhysique: physique, quantiteDefectueuse: avant.quantiteDefectueuse + quantite },
        mouvement: this.ajustement(produitId, avant.quantitePhysique, physique, motif),
      };
    });
  }

  // Renvoi ou destruction : le stock physique ne bouge pas, ce n'est donc pas un mouvement.
  async sortirDefectueux(produitId: string, corps: unknown): Promise<EtatStock> {
    const { quantite } = lireQuantite(corps, "quantite", 1);
    return this.modifier(produitId, (avant) => {
      if (quantite > avant.quantiteDefectueuse) {
        throw erreurInsuffisant(`Seuls ${avant.quantiteDefectueuse} exemplaires sont en stock défectueux.`);
      }
      return { apres: { ...avant, quantiteDefectueuse: avant.quantiteDefectueuse - quantite } };
    });
  }

  private ajustement(produitId: string, avant: number, apres: number, motif: string): NouveauMouvement {
    return {
      produitId,
      date: this.horloge.maintenant(),
      type: "ajustement",
      quantite: apres - avant,
      motif,
      operateur: "responsable",
      quantiteAvant: avant,
      quantiteApres: apres,
    };
  }

  private async modifier(
    produitId: string,
    calculer: (avant: Stock) => { apres: Stock; mouvement?: NouveauMouvement },
  ): Promise<EtatStock> {
    await this.verifierProduit(produitId);
    const avant = await this.stocks.trouver(produitId);
    const { apres, mouvement } = calculer(avant);
    try {
      await this.stocks.enregistrer(produitId, avant, apres, mouvement);
    } catch (erreur) {
      if (erreur instanceof StockModifieErreur) {
        throw new ErreurApi(409, "STOCK_MODIFIE", "Le stock vient de changer : rechargez et recommencez.");
      }
      throw erreur;
    }
    return versEtat(produitId, apres);
  }

  private async verifierProduit(produitId: string): Promise<void> {
    if (!(await this.produits.trouverParId(produitId))) {
      throw new ErreurApi(404, "INTROUVABLE", "Produit introuvable.");
    }
  }
}
