import {
  LIMITE_DEMANDES,
  type Demande,
  type FiltresDemandes,
  type NouvelleDemande,
  type PlanMisesDeCote,
} from "../modeles/demande.js";
import type { ChangementStock } from "../modeles/stock.js";
import type { DemandeRepository } from "./DemandeRepository.js";
import { MemoireNotificationRepository } from "./MemoireNotificationRepository.js";
import type { MemoireStockRepository } from "./MemoireStockRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

export class MemoireDemandeRepository implements DemandeRepository {
  private readonly demandes = new Map<string, Demande>();
  private prochainId = 1;

  constructor(
    private readonly stocks: MemoireStockRepository,
    readonly notifications = new MemoireNotificationRepository(),
  ) {}

  async creer(nouvelle: NouvelleDemande): Promise<Demande> {
    const id = String(this.prochainId++);
    const demande = { ...structuredClone(nouvelle), id };
    this.demandes.set(id, demande);
    return structuredClone(demande);
  }

  async trouverParId(id: string): Promise<Demande | null> {
    const demande = this.demandes.get(id);
    return demande ? structuredClone(demande) : null;
  }

  async lister({ clientId, statut, produitId }: FiltresDemandes): Promise<Demande[]> {
    return this.filtrer({ clientId, statut, produitId })
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .slice(0, LIMITE_DEMANDES)
      .map((d) => structuredClone(d));
  }

  async enAttente(produitId: string): Promise<Demande[]> {
    return this.filtrer({ produitId, statut: "en_attente" })
      .sort((a, b) => a.date.getTime() - b.date.getTime() || Number(a.id) - Number(b.id))
      .map((d) => structuredClone(d));
  }

  async misesDeCoteDuClient(clientId: string, produitIds: string[]): Promise<Demande[]> {
    return this.filtrer({ clientId, statut: "mise_de_cote" })
      .filter((d) => d.produitId !== undefined && produitIds.includes(d.produitId))
      .map((d) => structuredClone(d));
  }

  async misesDeCoteEchues(date: Date): Promise<Demande[]> {
    return this.filtrer({ statut: "mise_de_cote" })
      .filter((d) => d.miseDeCote !== undefined && d.miseDeCote.dateLimite.getTime() < date.getTime())
      .map((d) => structuredClone(d));
  }

  async annuler(id: string, date: Date): Promise<Demande | null> {
    const demande = this.demandes.get(id);
    if (!demande || demande.statut !== "en_attente") {
      return null;
    }
    demande.statut = "annulee";
    demande.dateFin = date;
    return structuredClone(demande);
  }

  async rattacher(id: string, produitId: string): Promise<Demande | null> {
    const demande = this.demandes.get(id);
    if (!demande || demande.statut !== "en_attente" || demande.produitId !== undefined) {
      return null;
    }
    demande.produitId = produitId;
    return structuredClone(demande);
  }

  async aDesDemandes(produitId: string): Promise<boolean> {
    return [...this.demandes.values()].some((d) => d.produitId === produitId);
  }

  async expirer(id: string, changement: ChangementStock, date: Date): Promise<boolean> {
    const demande = this.demandes.get(id);
    if (!demande || demande.statut !== "mise_de_cote") {
      return false;
    }
    try {
      this.stocks.appliquer([changement]);
    } catch (erreur) {
      if (erreur instanceof StockModifieErreur) {
        return false;
      }
      throw erreur;
    }
    demande.statut = "expiree";
    demande.dateFin = date;
    return true;
  }

  async mettreDeCote(changement: ChangementStock, plan: PlanMisesDeCote): Promise<void> {
    this.appliquerPlan(changement, plan);
  }

  // Tout ou rien, comme la transaction MongoDB : rien n'est écrit si le stock a changé ou si une demande
  // n'est plus en attente. Réutilisé par les réceptions.
  appliquerPlan(changement: ChangementStock, plan: PlanMisesDeCote): void {
    if (plan.misesDeCote.some(({ demandeId }) => this.demandes.get(demandeId)?.statut !== "en_attente")) {
      throw new StockModifieErreur(plan.produitId);
    }
    this.stocks.appliquer([changement]);
    for (const { demandeId, miseDeCote } of plan.misesDeCote) {
      const demande = this.demandes.get(demandeId)!;
      demande.statut = "mise_de_cote";
      demande.miseDeCote = { ...miseDeCote };
    }
    this.notifications.ajouter(plan.notifications);
  }

  // Pour la vente : vérifié avant d'écrire le stock, puis appliqué après.
  sontMisesDeCote(ids: string[]): boolean {
    return ids.every((id) => this.demandes.get(id)?.statut === "mise_de_cote");
  }

  honorer(ids: string[], date: Date): void {
    for (const id of ids) {
      const demande = this.demandes.get(id)!;
      demande.statut = "honoree";
      demande.dateFin = date;
    }
  }

  private filtrer({ clientId, statut, produitId }: FiltresDemandes): Demande[] {
    return [...this.demandes.values()].filter(
      (d) =>
        (clientId === undefined || d.client.id === clientId) &&
        (statut === undefined || d.statut === statut) &&
        (produitId === undefined || d.produitId === produitId),
    );
  }
}
