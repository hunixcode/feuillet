import { ErreurApi } from "../erreurs.js";
import { ajouterJours, finDuJour, horlogeSysteme, jourDe, type Horloge } from "../horloge.js";
import type { Parametres } from "../modeles/parametres.js";
import {
  ISSUES_RETOUR,
  type IssueRetour,
  type LigneRetournable,
  type NouveauRetour,
  type Retour,
  type RetoursVente,
} from "../modeles/retour.js";
import { quantiteVendable, type ChangementStock, type NouveauMouvement, type Stock } from "../modeles/stock.js";
import type { LigneVente, Vente } from "../modeles/vente.js";
import type { ParametresRepository } from "../repositories/ParametresRepository.js";
import type { RetourRepository } from "../repositories/RetourRepository.js";
import { StockModifieErreur, type StockRepository } from "../repositories/StockRepository.js";
import type { VenteRepository } from "../repositories/VenteRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";
import type { VenteService } from "./VenteService.js";

interface DemandeRetour {
  ligne: LigneVente;
  quantite: number;
  issue: IssueRetour;
  revendable: boolean;
  echange?: unknown;
}

// RG09 : 14 jours après la vente, 30 si elle porte l'option cadeau avec une occasion ; jusqu'à la fin du jour à Tahiti.
export function dateLimiteRetour(vente: Vente, parametres: Parametres): Date {
  const delai = vente.occasionCadeau ? parametres.delaiRetourCadeauJours : parametres.delaiRetourJours;
  return finDuJour(ajouterJours(jourDe(vente.date), delai));
}

function erreurIntrouvable(): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", "Vente introuvable.");
}

// EX07 : retours sur une ligne de vente (RG07, RG09, RG12, décisions 13 à 15).
export class RetourService {
  constructor(
    private readonly ventes: VenteRepository,
    private readonly retours: RetourRepository,
    private readonly stocks: StockRepository,
    private readonly parametres: ParametresRepository,
    private readonly venteService: VenteService,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  // Écran 9 : date limite, quantités déjà rendues et encore retournables de chaque ligne, retours passés.
  async retoursDeVente(venteId: string): Promise<RetoursVente> {
    const vente = await this.obtenirVente(venteId);
    const retours = await this.retours.listerDeVente(venteId);
    const dateLimite = dateLimiteRetour(vente, await this.parametres.obtenir());
    return {
      venteId,
      dateLimiteRetour: dateLimite,
      retourPossible: vente.statut === "expediee" && this.horloge.maintenant().getTime() <= dateLimite.getTime(),
      lignes: vente.lignes.map((ligne) => this.ligneRetournable(ligne, retours)),
      retours,
    };
  }

  async enregistrer(venteId: string, corps: unknown): Promise<Retour> {
    const vente = await this.obtenirVente(venteId);
    const demande = this.lire(vente, corps);
    if (vente.statut !== "expediee") {
      throw new ErreurApi(409, "VENTE_NON_EXPEDIEE", "La commande n'a pas encore été expédiée : rien à retourner.");
    }
    const dateLimite = dateLimiteRetour(vente, await this.parametres.obtenir());
    if (this.horloge.maintenant().getTime() > dateLimite.getTime()) {
      throw new ErreurApi(
        409,
        "DELAI_RETOUR_DEPASSE",
        `Le délai de retour de cette vente est dépassé depuis le ${dateLimite.toLocaleDateString("fr-FR", { timeZone: "Pacific/Tahiti" })}.`,
        { dateLimiteRetour: dateLimite },
      );
    }
    const { quantiteRetournable } = this.ligneRetournable(demande.ligne, await this.retours.listerDeVente(venteId));
    if (demande.quantite > quantiteRetournable) {
      throw new ErreurApi(
        409,
        "QUANTITE_NON_RETOURNABLE",
        `Seuls ${quantiteRetournable} exemplaires de cet article peuvent encore être retournés.`,
        { quantiteRetournable },
      );
    }

    // Échange : le nouvel article est commandé d'abord (sa disponibilité est vérifiée par la commande), puis le retour
    // est écrit.
    // shortcut: la commande d'échange et le retour sont deux transactions ; si le retour échoue ensuite (stock changé
    // entre-temps), la commande d'échange reste enregistrée et le retour est à refaire.
    const venteEchange =
      demande.issue === "echange" ? await this.venteService.commanderEchange(vente, demande.echange) : undefined;

    const date = this.horloge.maintenant();
    const avant = await this.stocks.trouver(demande.ligne.produitId);
    const { retour, changement } = this.calculer(vente, demande, avant, date, venteEchange);
    try {
      return await this.retours.creer(retour, changement);
    } catch (erreur) {
      if (erreur instanceof StockModifieErreur) {
        throw new ErreurApi(409, "STOCK_MODIFIE", "Le stock vient de changer : recommencez le retour.");
      }
      throw erreur;
    }
  }

  private calculer(
    vente: Vente,
    { ligne, quantite, issue, revendable }: DemandeRetour,
    avant: Stock,
    date: Date,
    venteEchange?: Vente,
  ): { retour: NouveauRetour; changement: ChangementStock } {
    const { produitId } = ligne;
    const valeur = ligne.prixUnitaire * quantite;
    const mouvement = (type: "retour" | "remplacement", variation: number, motif: string): NouveauMouvement => ({
      produitId,
      date,
      type,
      quantite: variation,
      motif,
      operateur: "responsable",
    });
    const commun = {
      venteId: vente.id,
      produitId,
      reference: ligne.reference,
      designation: ligne.designation,
      quantite,
      date,
      valeur,
    };

    // RG12 : remplacement d'un défectueux par un exemplaire neuf ; sans exemplaire disponible, remboursement.
    if (issue === "remplacement" && quantiteVendable(avant) >= quantite) {
      return {
        retour: { ...commun, issue, revendable: false, montantRembourse: 0, complementPaye: 0 },
        changement: {
          produitId,
          avant,
          apres: {
            ...avant,
            quantitePhysique: avant.quantitePhysique - quantite,
            quantiteDefectueuse: avant.quantiteDefectueuse + quantite,
          },
          mouvement: mouvement("remplacement", -quantite, "Remplacement d'un article défectueux"),
        },
      };
    }
    const remplacementImpossible = issue === "remplacement";
    const finalRevendable = remplacementImpossible ? false : revendable;
    // L'article rendu revient en stock s'il est revendable (éventuellement remis sous cellophane), sinon en défectueux.
    const apres = finalRevendable
      ? { ...avant, quantitePhysique: avant.quantitePhysique + quantite }
      : { ...avant, quantiteDefectueuse: avant.quantiteDefectueuse + quantite };
    const variation = finalRevendable ? quantite : 0;

    if (issue === "echange") {
      const difference = venteEchange!.total - valeur;
      return {
        retour: {
          ...commun,
          issue,
          revendable: true,
          montantRembourse: Math.max(0, -difference),
          complementPaye: Math.max(0, difference),
          venteEchangeId: venteEchange!.id,
        },
        changement: { produitId, avant, apres, mouvement: mouvement("retour", variation, "Retour échangé") },
      };
    }
    return {
      retour: {
        ...commun,
        issue: "remboursement",
        revendable: finalRevendable,
        montantRembourse: valeur,
        complementPaye: 0,
        ...(remplacementImpossible && { remplacementImpossible: true }),
      },
      changement: {
        produitId,
        avant,
        apres,
        mouvement: mouvement(
          "retour",
          variation,
          finalRevendable ? "Retour remboursé, remis en stock" : "Retour remboursé, article défectueux",
        ),
      },
    };
  }

  private lire(vente: Vente, corps: unknown): DemandeRetour {
    const donnees = lireObjet(corps);
    const champs: ErreursChamps = {};
    const ligne = vente.lignes.find((l) => l.produitId === donnees.produitId);
    if (!ligne) {
      champs.produitId = "Cet article ne fait pas partie de la vente.";
    }
    if (!Number.isInteger(donnees.quantite) || (donnees.quantite as number) < 1) {
      champs.quantite = "La quantité doit être un nombre entier positif.";
    }
    const issue = donnees.issue as IssueRetour;
    if (!ISSUES_RETOUR.includes(issue)) {
      champs.issue = `L'issue doit être : ${ISSUES_RETOUR.join(", ")}.`;
    }
    if (donnees.revendable !== undefined && typeof donnees.revendable !== "boolean") {
      champs.revendable = "Revendable doit valoir true ou false.";
    }
    if (issue === "echange") {
      if (donnees.revendable === false) {
        champs.revendable = "Un échange suppose le plastique intact : l'article doit être revendable.";
      }
      if (!Array.isArray(lireObjet(donnees.echange).lignes)) {
        champs.echange = "Indiquez les articles remis en échange.";
      }
    }
    if (Object.keys(champs).length > 0) {
      throw erreurValidation(champs);
    }
    return {
      ligne: ligne!,
      quantite: donnees.quantite as number,
      issue,
      // Remplacement : l'article rendu est défectueux. Remboursement : revendable sauf indication contraire.
      revendable: issue === "remplacement" ? false : donnees.revendable !== false,
      ...(issue === "echange" && { echange: donnees.echange }),
    };
  }

  private ligneRetournable(ligne: LigneVente, retours: Retour[]): LigneRetournable {
    const quantiteRetournee = retours
      .filter((r) => r.produitId === ligne.produitId)
      .reduce((somme, r) => somme + r.quantite, 0);
    return {
      produitId: ligne.produitId,
      reference: ligne.reference,
      designation: ligne.designation,
      quantite: ligne.quantite,
      prixUnitaire: ligne.prixUnitaire,
      quantiteRetournee,
      quantiteRetournable: Math.max(0, ligne.quantite - quantiteRetournee),
    };
  }

  private async obtenirVente(id: string): Promise<Vente> {
    const vente = await this.ventes.trouverParId(id);
    if (!vente) {
      throw erreurIntrouvable();
    }
    return vente;
  }
}
