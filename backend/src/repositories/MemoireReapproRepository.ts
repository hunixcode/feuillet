import type { PlanMisesDeCote } from "../modeles/demande.js";
import {
  LIMITE_COMMANDES_FOURNISSEUR,
  type ChangementCommande,
  type CommandeFournisseur,
  type FiltresCommandesFournisseur,
  type Fournisseur,
  type NouveauFournisseur,
  type NouvelleCommandeFournisseur,
  type NouvelleReception,
  type Reception,
} from "../modeles/reappro.js";
import type { ChangementStock } from "../modeles/stock.js";
import type { MemoireDemandeRepository } from "./MemoireDemandeRepository.js";
import {
  CommandeModifieeErreur,
  ReceptionDejaValideeErreur,
  type CommandeFournisseurRepository,
  type FournisseurRepository,
  type SeuilAlerteRepository,
} from "./ReapproRepository.js";

export class MemoireFournisseurRepository implements FournisseurRepository {
  private readonly fournisseurs = new Map<string, Fournisseur>();
  private prochainId = 1;

  async creer(nouveau: NouveauFournisseur): Promise<Fournisseur> {
    const fournisseur = { ...nouveau, id: String(this.prochainId++) };
    this.fournisseurs.set(fournisseur.id, fournisseur);
    return { ...fournisseur };
  }

  async remplacer(fournisseur: Fournisseur): Promise<Fournisseur | null> {
    if (!this.fournisseurs.has(fournisseur.id)) {
      return null;
    }
    this.fournisseurs.set(fournisseur.id, { ...fournisseur });
    return { ...fournisseur };
  }

  async lister(): Promise<Fournisseur[]> {
    return [...this.fournisseurs.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((f) => ({ ...f }));
  }

  async trouverParId(id: string): Promise<Fournisseur | null> {
    const fournisseur = this.fournisseurs.get(id);
    return fournisseur ? { ...fournisseur } : null;
  }
}

export class MemoireCommandeFournisseurRepository implements CommandeFournisseurRepository {
  private readonly commandes = new Map<string, CommandeFournisseur>();
  private readonly receptions = new Map<string, Reception>();
  private prochainId = 1;

  constructor(private readonly demandes: MemoireDemandeRepository) {}

  async creer(nouvelle: NouvelleCommandeFournisseur): Promise<CommandeFournisseur> {
    const commande = { ...structuredClone(nouvelle), id: String(this.prochainId++) };
    this.commandes.set(commande.id, commande);
    return structuredClone(commande);
  }

  async trouverParId(id: string): Promise<CommandeFournisseur | null> {
    const commande = this.commandes.get(id);
    return commande ? structuredClone(commande) : null;
  }

  async lister({ statut, produitId, fournisseurId }: FiltresCommandesFournisseur): Promise<CommandeFournisseur[]> {
    return [...this.commandes.values()]
      .filter(
        (c) =>
          (statut === undefined || c.statut === statut) &&
          (produitId === undefined || c.produitId === produitId) &&
          (fournisseurId === undefined || c.fournisseur.id === fournisseurId),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .slice(0, LIMITE_COMMANDES_FOURNISSEUR)
      .map((c) => structuredClone(c));
  }

  async enCours(produitIds: string[]): Promise<CommandeFournisseur[]> {
    return [...this.commandes.values()]
      .filter((c) => c.statut !== "recue" && produitIds.includes(c.produitId))
      .map((c) => structuredClone(c));
  }

  async derniereRecue(produitId: string): Promise<CommandeFournisseur | null> {
    const [derniere] = [...this.commandes.values()]
      .filter((c) => c.produitId === produitId && c.dateReceptionComplete !== undefined)
      .sort((a, b) => b.dateReceptionComplete!.getTime() - a.dateReceptionComplete!.getTime() || Number(b.id) - Number(a.id));
    return derniere ? structuredClone(derniere) : null;
  }

  async aDesCommandes(produitId: string): Promise<boolean> {
    return [...this.commandes.values()].some((c) => c.produitId === produitId);
  }

  async creerReception(nouvelle: NouvelleReception): Promise<Reception> {
    const reception = { ...structuredClone(nouvelle), id: String(this.prochainId++) };
    this.receptions.set(reception.id, reception);
    return structuredClone(reception);
  }

  async trouverReception(id: string): Promise<Reception | null> {
    const reception = this.receptions.get(id);
    return reception ? structuredClone(reception) : null;
  }

  async listerReceptions(commandeId: string): Promise<Reception[]> {
    return [...this.receptions.values()]
      .filter((r) => r.commandeId === commandeId)
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .map((r) => structuredClone(r));
  }

  // Tout ou rien, comme la transaction MongoDB : tout est vérifié avant la moindre écriture.
  async validerReception(
    receptionId: string,
    date: Date,
    { commandeId, quantiteRecueAvant, ...apres }: ChangementCommande,
    changement: ChangementStock,
    plan: PlanMisesDeCote,
  ): Promise<void> {
    const reception = this.receptions.get(receptionId);
    if (!reception || reception.validee) {
      throw new ReceptionDejaValideeErreur(receptionId);
    }
    const commande = this.commandes.get(commandeId);
    if (!commande || commande.quantiteRecue !== quantiteRecueAvant) {
      throw new CommandeModifieeErreur(commandeId);
    }
    this.demandes.appliquerPlan(
      { ...changement, ...(changement.mouvement && { mouvement: { ...changement.mouvement, receptionId } }) },
      plan,
    );
    reception.validee = true;
    reception.dateValidation = date;
    Object.assign(commande, apres);
  }
}

export class MemoireSeuilAlerteRepository implements SeuilAlerteRepository {
  private readonly valeurs = new Map<string, number>();

  async seuils(produitIds: string[]): Promise<Map<string, number>> {
    return new Map(produitIds.filter((id) => this.valeurs.has(id)).map((id) => [id, this.valeurs.get(id)!]));
  }

  async definir(produitId: string, seuil: number | null): Promise<void> {
    if (seuil === null) {
      this.valeurs.delete(produitId);
    } else {
      this.valeurs.set(produitId, seuil);
    }
  }
}
