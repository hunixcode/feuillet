import { ajouterJours, dateDuJour, debutDuJour, finDuJour, horlogeSysteme, type Horloge } from "../horloge.js";
import type { Produit, ProduitCatalogue } from "../modeles/produit.js";
import type { Retour } from "../modeles/retour.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import type { RetourRepository } from "../repositories/RetourRepository.js";
import type { StockRepository } from "../repositories/StockRepository.js";
import type { VenteRepository } from "../repositories/VenteRepository.js";
import { erreurValidation, lireObjet } from "../validation.js";
import type { ProduitService } from "./ProduitService.js";
import type { ReapproService } from "./ReapproService.js";

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DUREE_MAX_JOURS = 366;
const NOMBRE_MEILLEURES_VENTES = 10;
const JOURS_MEILLEURES_VENTES = 30;

export interface LigneRapport {
  produitId: string;
  reference: string;
  designation: string;
  categorie: string;
  quantiteVendue: number;
  montantVentes: number;
  quantiteRetournee: number;
  montantRetours: number;
  quantiteNette: number;
  montantNet: number;
  quantiteRemplacee: number;
  // Stock physique à la fin de la période, recalculé depuis les mouvements (RG08).
  stockRestant: number;
  // Quantité nette vendue sur la période, en % de la quantité achetée à l'origine ; null si elle est inconnue.
  pourcentageVendu: number | null;
}

export interface Rapport {
  periode: { debut: string; fin: string };
  categorie?: string;
  totaux: {
    ventesBrutes: number;
    retours: number;
    net: number;
    quantiteVendue: number;
    quantiteRetournee: number;
    quantiteNette: number;
  };
  // Statistiques globales, sans aucune statistique par employé (décision 22).
  statistiques: {
    nombreVentes: number;
    panierMoyen: number;
    nombreRetours: number;
  };
  produits: LigneRapport[];
}

export type MeilleureVente = ProduitCatalogue & { quantiteVendue: number };

function estDateValide(texte: unknown): texte is string {
  return (
    typeof texte === "string" &&
    FORMAT_DATE.test(texte) &&
    new Date(`${texte}T00:00:00Z`).toISOString().startsWith(texte)
  );
}

// Décision 21 : semaine du lundi au dimanche (heure de Tahiti) contenant le jour donné.
export function semaineDe(jour: string): { debut: string; fin: string } {
  const jourSemaine = new Date(`${jour}T00:00:00Z`).getUTCDay();
  const debut = ajouterJours(jour, -((jourSemaine + 6) % 7));
  return { debut, fin: ajouterJours(debut, 6) };
}

// Retours qui diminuent les ventes : un remplacement rend un article neuf au client, il ne change pas la vente.
function diminueLesVentes(retour: Retour): boolean {
  return retour.issue !== "remplacement";
}

function champCsv(valeur: string | number | null): string {
  const texte = valeur === null ? "" : String(valeur);
  return /[;"\n\r]/.test(texte) ? `"${texte.replaceAll('"', '""')}"` : texte;
}

// EX08 et EX10 : rapports (RG08, décisions 21 et 22) et meilleures ventes (RG14).
export class RapportService {
  constructor(
    private readonly ventes: VenteRepository,
    private readonly retours: RetourRepository,
    private readonly produits: ProduitRepository,
    private readonly stocks: StockRepository,
    private readonly reappro: ReapproService,
    private readonly produitService: ProduitService,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  // Période : `debut` et `fin` (AAAA-MM-JJ, inclus) ou `semaine` (un jour de la semaine voulue, par défaut aujourd'hui).
  async rapport(requete: unknown): Promise<Rapport> {
    const { debut, fin, categorie } = this.lirePeriode(requete);
    const instantFin = finDuJour(fin);
    const [ventes, retours, actifs, archives, variations] = await Promise.all([
      this.ventes.listerPeriode(debutDuJour(debut), instantFin),
      this.retours.listerPeriode(debutDuJour(debut), instantFin),
      this.produits.lister({ archive: false }),
      this.produits.lister({ archive: true }),
      this.stocks.variationsDepuis(instantFin),
    ]);
    const parId = new Map<string, Produit>([...actifs, ...archives].map((p) => [p.id, p]));
    const dansLeFiltre = (produitId: string) =>
      categorie === undefined || parId.get(produitId)?.categorie === categorie;

    const lignes = new Map<string, LigneRapport>();
    const ligne = (produitId: string, reference: string, designation: string): LigneRapport => {
      let existante = lignes.get(produitId);
      if (!existante) {
        existante = {
          produitId,
          reference: parId.get(produitId)?.reference ?? reference,
          designation: parId.get(produitId)?.designation ?? designation,
          categorie: parId.get(produitId)?.categorie ?? "",
          quantiteVendue: 0,
          montantVentes: 0,
          quantiteRetournee: 0,
          montantRetours: 0,
          quantiteNette: 0,
          montantNet: 0,
          quantiteRemplacee: 0,
          stockRestant: 0,
          pourcentageVendu: null,
        };
        lignes.set(produitId, existante);
      }
      return existante;
    };

    const statistiques = { nombreVentes: 0, panierMoyen: 0, nombreRetours: 0 };
    let montantDesVentes = 0;
    for (const vente of ventes) {
      const lignesDuFiltre = vente.lignes.filter((l) => dansLeFiltre(l.produitId));
      if (lignesDuFiltre.length === 0) {
        continue;
      }
      statistiques.nombreVentes++;
      for (const l of lignesDuFiltre) {
        const cible = ligne(l.produitId, l.reference, l.designation);
        cible.quantiteVendue += l.quantite;
        cible.montantVentes += l.montant;
        montantDesVentes += l.montant;
      }
    }
    for (const retour of retours.filter((r) => dansLeFiltre(r.produitId))) {
      statistiques.nombreRetours++;
      const cible = ligne(retour.produitId, retour.reference, retour.designation);
      if (diminueLesVentes(retour)) {
        cible.quantiteRetournee += retour.quantite;
        cible.montantRetours += retour.valeur;
      } else {
        cible.quantiteRemplacee += retour.quantite;
      }
    }
    // Le stock restant de chaque article actif du filtre est montré, même sans activité sur la période.
    for (const produit of actifs.filter((p) => dansLeFiltre(p.id))) {
      ligne(produit.id, produit.reference, produit.designation);
    }

    const stocksActuels = await this.stocks.trouverPlusieurs([...lignes.keys()]);
    for (const l of lignes.values()) {
      l.quantiteNette = l.quantiteVendue - l.quantiteRetournee;
      l.montantNet = l.montantVentes - l.montantRetours;
      l.stockRestant = stocksActuels.get(l.produitId)!.quantitePhysique - (variations.get(l.produitId) ?? 0);
      const origine = await this.reappro.quantiteAcheteeOrigine(l.produitId);
      l.pourcentageVendu = origine > 0 ? Math.round((l.quantiteNette / origine) * 100) : null;
    }
    statistiques.panierMoyen = statistiques.nombreVentes > 0 ? Math.round(montantDesVentes / statistiques.nombreVentes) : 0;

    const produits = [...lignes.values()].sort(
      (a, b) => b.montantNet - a.montantNet || a.designation.localeCompare(b.designation, "fr"),
    );
    const somme = (champ: keyof LigneRapport) => produits.reduce((total, l) => total + (l[champ] as number), 0);
    return {
      periode: { debut, fin },
      ...(categorie !== undefined && { categorie }),
      totaux: {
        ventesBrutes: somme("montantVentes"),
        retours: somme("montantRetours"),
        net: somme("montantNet"),
        quantiteVendue: somme("quantiteVendue"),
        quantiteRetournee: somme("quantiteRetournee"),
        quantiteNette: somme("quantiteNette"),
      },
      statistiques,
      produits,
    };
  }

  // Export CSV du rapport (séparateur « ; » et BOM UTF-8, pour Excel en français).
  async exporterCsv(requete: unknown): Promise<{ nomFichier: string; contenu: string }> {
    const rapport = await this.rapport(requete);
    const lignes: (string | number | null)[][] = [
      [`Rapport du ${rapport.periode.debut} au ${rapport.periode.fin}`],
      ...(rapport.categorie === undefined ? [] : [[`Catégorie : ${rapport.categorie}`]]),
      [],
      [
        "Référence",
        "Désignation",
        "Catégorie",
        "Quantité vendue",
        "Ventes (XPF)",
        "Quantité retournée",
        "Retours (XPF)",
        "Quantité nette",
        "Net (XPF)",
        "Quantité remplacée",
        "Stock restant",
        "% vendu de la quantité achetée",
      ],
      ...rapport.produits.map((l) => [
        l.reference,
        l.designation,
        l.categorie,
        l.quantiteVendue,
        l.montantVentes,
        l.quantiteRetournee,
        l.montantRetours,
        l.quantiteNette,
        l.montantNet,
        l.quantiteRemplacee,
        l.stockRestant,
        l.pourcentageVendu,
      ]),
      [],
      ["Total", "", "", rapport.totaux.quantiteVendue, rapport.totaux.ventesBrutes, rapport.totaux.quantiteRetournee, rapport.totaux.retours, rapport.totaux.quantiteNette, rapport.totaux.net],
      [],
      ["Nombre de ventes", rapport.statistiques.nombreVentes],
      ["Panier moyen (XPF)", rapport.statistiques.panierMoyen],
      ["Nombre de retours", rapport.statistiques.nombreRetours],
    ];
    return {
      nomFichier: `rapport-${rapport.periode.debut}-${rapport.periode.fin}.csv`,
      contenu: `﻿${lignes.map((l) => l.map(champCsv).join(";")).join("\r\n")}\r\n`,
    };
  }

  // RG14 : les 10 produits les plus vendus, nets des retours, sur les 30 derniers jours ; même liste pour tous.
  // EX10 : filtre facultatif par catégorie.
  async meilleuresVentes(requete: unknown): Promise<MeilleureVente[]> {
    const { categorie } = lireObjet(requete);
    const fin = this.horloge.maintenant();
    const debut = new Date(fin.getTime() - JOURS_MEILLEURES_VENTES * 86_400_000);
    const [ventes, retours] = await Promise.all([this.ventes.listerPeriode(debut, fin), this.retours.listerPeriode(debut, fin)]);
    const nettes = new Map<string, number>();
    for (const l of ventes.flatMap((v) => v.lignes)) {
      nettes.set(l.produitId, (nettes.get(l.produitId) ?? 0) + l.quantite);
    }
    for (const r of retours.filter(diminueLesVentes)) {
      nettes.set(r.produitId, (nettes.get(r.produitId) ?? 0) - r.quantite);
    }
    const candidats = [...nettes].filter(([, quantite]) => quantite > 0);
    const fiches = new Map((await this.produitService.catalogueDe(candidats.map(([id]) => id))).map((p) => [p.id, p]));
    return candidats
      .filter(([id]) => fiches.has(id) && (typeof categorie !== "string" || !categorie || fiches.get(id)!.categorie === categorie))
      .map(([id, quantiteVendue]) => ({ ...fiches.get(id)!, quantiteVendue }))
      .sort((a, b) => b.quantiteVendue - a.quantiteVendue || a.designation.localeCompare(b.designation, "fr"))
      .slice(0, NOMBRE_MEILLEURES_VENTES);
  }

  private lirePeriode(requete: unknown): { debut: string; fin: string; categorie?: string } {
    const { debut, fin, semaine, categorie } = lireObjet(requete);
    const categorieFiltre = typeof categorie === "string" && categorie ? { categorie } : {};
    if (debut !== undefined || fin !== undefined) {
      const champs: Record<string, string> = {};
      if (!estDateValide(debut)) {
        champs.debut = "La date de début doit être une date valide au format AAAA-MM-JJ.";
      }
      if (!estDateValide(fin)) {
        champs.fin = "La date de fin doit être une date valide au format AAAA-MM-JJ.";
      } else if (estDateValide(debut) && fin < debut) {
        champs.fin = "La date de fin doit suivre la date de début.";
      } else if (estDateValide(debut) && ajouterJours(debut, DUREE_MAX_JOURS) <= fin) {
        champs.fin = `La période ne doit pas dépasser ${DUREE_MAX_JOURS} jours.`;
      }
      if (Object.keys(champs).length > 0) {
        throw erreurValidation(champs);
      }
      return { debut: debut as string, fin: fin as string, ...categorieFiltre };
    }
    if (semaine !== undefined && !estDateValide(semaine)) {
      throw erreurValidation({ semaine: "La semaine doit être indiquée par une date valide au format AAAA-MM-JJ." });
    }
    return { ...semaineDe((semaine as string | undefined) ?? dateDuJour(this.horloge)), ...categorieFiltre };
  }
}
