import { ErreurApi } from "../erreurs.js";
import { dateDuJour, horlogeSysteme, type Horloge } from "../horloge.js";
import {
  STATUTS_DEMANDE,
  type ClientDemande,
  type Demande,
  type NouvelleNotification,
  type Notification,
  type PlanMisesDeCote,
  type StatutDemande,
} from "../modeles/demande.js";
import { quantiteVendable, type Stock } from "../modeles/stock.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import type { DemandeRepository } from "../repositories/DemandeRepository.js";
import type { NotificationRepository } from "../repositories/NotificationRepository.js";
import type { ParametresRepository } from "../repositories/ParametresRepository.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import type { StockRepository } from "../repositories/StockRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";

const QUANTITE_MAX = 99;
const LONGUEUR_MAX_TITRE = 200;
const LONGUEUR_MAX_AUTEUR = 100;
const FORMAT_ISBN = /^[0-9][0-9 -]{8,15}[0-9Xx]$/;

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function versClient({ id, nom, email }: UtilisateurPublic): ClientDemande {
  return { id, nom, email };
}

function erreurIntrouvable(message = "Demande introuvable."): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", message);
}

function lireQuantite(valeur: unknown, champs: ErreursChamps): number {
  if (!Number.isInteger(valeur) || (valeur as number) < 1 || (valeur as number) > QUANTITE_MAX) {
    champs.quantiteSouhaitee = `La quantité doit être un nombre entier entre 1 et ${QUANTITE_MAX}.`;
    return 0;
  }
  return valeur as number;
}

// Livre absent du catalogue : titre obligatoire, auteur et ISBN facultatifs.
function lireLivreHorsCatalogue(donnees: Record<string, unknown>, champs: ErreursChamps) {
  const titre = lireTexte(donnees.titre);
  const auteur = lireTexte(donnees.auteur);
  const isbn = lireTexte(donnees.isbn);
  if (!titre) {
    champs.titre = "Le titre est obligatoire.";
  } else if (titre.length > LONGUEUR_MAX_TITRE) {
    champs.titre = `Le titre ne doit pas dépasser ${LONGUEUR_MAX_TITRE} caractères.`;
  }
  if (auteur.length > LONGUEUR_MAX_AUTEUR) {
    champs.auteur = `L'auteur ne doit pas dépasser ${LONGUEUR_MAX_AUTEUR} caractères.`;
  }
  if (isbn && !FORMAT_ISBN.test(isbn)) {
    champs.isbn = "L'ISBN doit contenir 10 ou 13 chiffres (tirets et espaces acceptés).";
  }
  return { titre, ...(auteur && { auteur }), ...(isbn && { isbn }) };
}

function lireStatut(requete: unknown): StatutDemande | undefined {
  const { statut } = lireObjet(requete);
  if (statut === undefined) {
    return undefined;
  }
  if (!STATUTS_DEMANDE.includes(statut as StatutDemande)) {
    throw erreurValidation({ statut: `Le statut doit être : ${STATUTS_DEMANDE.join(", ")}.` });
  }
  return statut as StatutDemande;
}

// RG06 : la mise de côté court jusqu'à la fin du jour (heure de Tahiti) situé `jours` jours après aujourd'hui.
export function dateLimiteMiseDeCote(horloge: Horloge, jours: number): Date {
  const jour = new Date(`${dateDuJour(horloge)}T00:00:00Z`);
  jour.setUTCDate(jour.getUTCDate() + jours);
  return new Date(`${jour.toISOString().slice(0, 10)}T23:59:59.999-10:00`);
}

function formaterDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { timeZone: "Pacific/Tahiti" });
}

export class DemandeService {
  constructor(
    private readonly demandes: DemandeRepository,
    private readonly notifications: NotificationRepository,
    private readonly produits: ProduitRepository,
    private readonly stocks: StockRepository,
    private readonly parametres: ParametresRepository,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  // Sur un produit épuisé du catalogue (produitId), ou sur un livre absent du catalogue (titre).
  async creer(client: UtilisateurPublic, corps: unknown): Promise<Demande> {
    const donnees = lireObjet(corps);
    const champs: ErreursChamps = {};
    const quantiteSouhaitee = lireQuantite(donnees.quantiteSouhaitee, champs);
    const produitId = lireTexte(donnees.produitId);
    const livre = produitId ? undefined : lireLivreHorsCatalogue(donnees, champs);
    if (Object.keys(champs).length > 0) {
      throw erreurValidation(champs);
    }

    const commun = {
      client: versClient(client),
      quantiteSouhaitee,
      date: this.horloge.maintenant(),
      statut: "en_attente" as const,
    };
    if (livre) {
      return this.demandes.creer({ ...commun, ...livre });
    }

    const produit = await this.produits.trouverParId(produitId);
    if (!produit || produit.archive) {
      throw erreurIntrouvable("Produit introuvable.");
    }
    if (quantiteVendable(await this.stocks.trouver(produitId)) > 0) {
      throw new ErreurApi(409, "PRODUIT_DISPONIBLE", "Cet article est disponible : ajoutez-le au panier.");
    }
    const enCours = await this.demandes.lister({ clientId: client.id, produitId });
    if (enCours.some((d) => d.statut === "en_attente" || d.statut === "mise_de_cote")) {
      throw new ErreurApi(409, "DEMANDE_EN_COURS", "Vous avez déjà une demande en cours pour cet article.");
    }
    return this.demandes.creer({
      ...commun,
      produitId,
      titre: produit.designation,
      ...(produit.auteur && { auteur: produit.auteur }),
      ...(produit.isbn && { isbn: produit.isbn }),
    });
  }

  async mesDemandes(client: UtilisateurPublic): Promise<Demande[]> {
    await this.expirerEcheances();
    return this.demandes.lister({ clientId: client.id });
  }

  async lister(requete: unknown): Promise<Demande[]> {
    const statut = lireStatut(requete);
    await this.expirerEcheances();
    return this.demandes.lister(statut === undefined ? {} : { statut });
  }

  // Le client annule une de ses demandes tant qu'elle est en attente.
  async annuler(client: UtilisateurPublic, id: string): Promise<Demande> {
    const demande = await this.demandes.trouverParId(id);
    if (!demande || demande.client.id !== client.id) {
      throw erreurIntrouvable();
    }
    const annulee = await this.demandes.annuler(id, this.horloge.maintenant());
    if (!annulee) {
      throw new ErreurApi(409, "DEMANDE_NON_ANNULABLE", "Seule une demande en attente peut être annulée.");
    }
    return annulee;
  }

  // RG06 : une demande hors catalogue est rattachée au produit créé par le responsable.
  async rattacher(id: string, corps: unknown): Promise<Demande> {
    const produitId = lireTexte(lireObjet(corps).produitId);
    if (!produitId) {
      throw erreurValidation({ produitId: "Le produit est obligatoire." });
    }
    if (!(await this.demandes.trouverParId(id))) {
      throw erreurIntrouvable();
    }
    const produit = await this.produits.trouverParId(produitId);
    if (!produit || produit.archive) {
      throw erreurValidation({ produitId: "Produit introuvable ou archivé." });
    }
    const rattachee = await this.demandes.rattacher(id, produitId);
    if (!rattachee) {
      throw new ErreurApi(
        409,
        "DEMANDE_NON_RATTACHABLE",
        "Seule une demande hors catalogue encore en attente peut être rattachée à un produit.",
      );
    }
    return rattachee;
  }

  // Diagramme de séquence de la réception : avec le stock du produit après l'entrée, les demandes en attente sont
  // mises de côté par ordre d'arrivée tant qu'il reste du stock vendable, et leurs clients sont prévenus.
  async planifierMisesDeCote(produitId: string, stock: Stock): Promise<PlanMisesDeCote> {
    const enAttente = await this.demandes.enAttente(produitId);
    const plan: PlanMisesDeCote = { produitId, stockApres: { ...stock }, misesDeCote: [], notifications: [] };
    if (enAttente.length === 0 || quantiteVendable(stock) === 0) {
      return plan;
    }
    const { dureeMiseDeCoteJours } = await this.parametres.obtenir();
    const produit = await this.produits.trouverParId(produitId);
    const date = this.horloge.maintenant();
    const dateLimite = dateLimiteMiseDeCote(this.horloge, dureeMiseDeCoteJours);
    for (const demande of enAttente) {
      const vendable = quantiteVendable(plan.stockApres);
      if (vendable === 0) {
        break;
      }
      const quantite = Math.min(demande.quantiteSouhaitee, vendable);
      plan.stockApres.quantiteMiseDeCote += quantite;
      plan.misesDeCote.push({ demandeId: demande.id, miseDeCote: { quantite, dateLimite } });
      plan.notifications.push(this.notification(demande, produit?.designation ?? demande.titre, quantite, dateLimite, date));
    }
    return plan;
  }

  // RG06, décision 18 : à l'échéance, la quantité est libérée et la demande passe à expiree, sans remise en attente.
  // Appelé avant chaque liste de demandes et régulièrement par le serveur. Renvoie le nombre de demandes expirées.
  async expirerEcheances(): Promise<number> {
    const date = this.horloge.maintenant();
    let expirees = 0;
    for (const demande of await this.demandes.misesDeCoteEchues(date)) {
      const avant = await this.stocks.trouver(demande.produitId!);
      const apres = {
        ...avant,
        quantiteMiseDeCote: Math.max(0, avant.quantiteMiseDeCote - (demande.miseDeCote?.quantite ?? 0)),
      };
      if (await this.demandes.expirer(demande.id, { produitId: demande.produitId!, avant, apres }, date)) {
        expirees++;
      }
    }
    return expirees;
  }

  mesNotifications(client: UtilisateurPublic): Promise<Notification[]> {
    return this.notifications.listerDuClient(client.id);
  }

  async marquerLue(client: UtilisateurPublic, id: string): Promise<Notification> {
    const notification = await this.notifications.marquerLue(id, client.id);
    if (!notification) {
      throw erreurIntrouvable("Notification introuvable.");
    }
    return notification;
  }

  private notification(
    demande: Demande,
    designation: string,
    quantite: number,
    dateLimite: Date,
    date: Date,
  ): NouvelleNotification {
    const exemplaires = quantite > 1 ? `${quantite} exemplaires mis` : "1 exemplaire mis";
    return {
      clientId: demande.client.id,
      produitId: demande.produitId!,
      type: "reapprovisionnement",
      date,
      message: `« ${designation} » est arrivé : ${exemplaires} de côté pour vous jusqu'au ${formaterDate(dateLimite)}.`,
      lue: false,
    };
  }
}
