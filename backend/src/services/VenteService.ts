import { ErreurApi } from "../erreurs.js";
import { dateDuJour, horlogeSysteme, type Horloge } from "../horloge.js";
import type { Parametres } from "../modeles/parametres.js";
import { quantiteVendable, type ChangementStock, type Stock } from "../modeles/stock.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import {
  OCCASIONS_CADEAU,
  RESULTATS_PAIEMENT_DEMO,
  STATUTS_VENTE,
  type ClientVente,
  type FiltresVentes,
  type LigneCommande,
  type LigneVente,
  type Montants,
  type OccasionCadeau,
  type OptionsVente,
  type ResultatPaiementDemo,
  type StatutVente,
  type Vente,
} from "../modeles/vente.js";
import type { DemandeRepository } from "../repositories/DemandeRepository.js";
import type { ParametresRepository } from "../repositories/ParametresRepository.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import { StockModifieErreur, type StockRepository } from "../repositories/StockRepository.js";
import type { VenteRepository } from "../repositories/VenteRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";
import { prixApplique, promotionDuJour } from "./ProduitService.js";

const LIGNES_MAX = 100;
const QUANTITE_MAX = 999;
const LONGUEUR_MAX_ADRESSE = 300;

export type LigneIndisponible = LigneCommande;

export interface Devis extends Montants {
  lignes: LigneVente[];
  lignesIndisponibles: LigneIndisponible[];
}

interface Panier extends OptionsVente {
  lignes: LigneCommande[];
  paiementDemo?: ResultatPaiementDemo;
}

// RG11 : TVA incluse dans le prix TTC, arrondie à l'unité, calculée sur le montant de la ligne.
export function montantTva(montant: number, tauxTva: number): number {
  return Math.round((montant * tauxTva) / (100 + tauxTva));
}

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

// Deux lignes du même produit sont regroupées : la disponibilité se vérifie sur la quantité totale.
function lireLignes(valeur: unknown, champs: ErreursChamps): LigneCommande[] {
  if (!Array.isArray(valeur) || valeur.length === 0) {
    champs.lignes = "Le panier est vide.";
    return [];
  }
  if (valeur.length > LIGNES_MAX) {
    champs.lignes = `Le panier ne peut pas dépasser ${LIGNES_MAX} lignes.`;
    return [];
  }
  const quantites = new Map<string, number>();
  for (const brute of valeur) {
    const { produitId, quantite } = lireObjet(brute);
    if (typeof produitId !== "string" || !produitId.trim()) {
      champs.lignes = "Chaque ligne doit indiquer un produit.";
      return [];
    }
    if (!Number.isInteger(quantite) || (quantite as number) < 1) {
      champs.lignes = "Chaque quantité doit être un nombre entier positif.";
      return [];
    }
    quantites.set(produitId, (quantites.get(produitId) ?? 0) + (quantite as number));
  }
  if ([...quantites.values()].some((q) => q > QUANTITE_MAX)) {
    champs.lignes = `La quantité d'un article ne peut pas dépasser ${QUANTITE_MAX}.`;
    return [];
  }
  return [...quantites].map(([produitId, quantite]) => ({ produitId, quantite }));
}

// confirmation : commande en ligne du client, qui exige l'adresse (la livraison est obligatoire en ligne, RG13)
// et le résultat du paiement de démonstration.
function lirePanier(corps: unknown, confirmation: boolean): Panier {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};
  const lignes = lireLignes(donnees.lignes, champs);

  const occasion = donnees.occasionCadeau;
  if (occasion !== undefined && occasion !== null && occasion !== "" && !OCCASIONS_CADEAU.includes(occasion as OccasionCadeau)) {
    champs.occasionCadeau = `L'occasion doit être : ${OCCASIONS_CADEAU.join(", ")}.`;
  }
  if (donnees.emballageCadeau !== undefined && typeof donnees.emballageCadeau !== "boolean") {
    champs.emballageCadeau = "L'emballage cadeau doit valoir true ou false.";
  }
  const adresse = lireTexte(donnees.adresseLivraison);
  if (adresse.length > LONGUEUR_MAX_ADRESSE) {
    champs.adresseLivraison = `L'adresse ne doit pas dépasser ${LONGUEUR_MAX_ADRESSE} caractères.`;
  } else if (!adresse && confirmation) {
    champs.adresseLivraison = "L'adresse de livraison est obligatoire.";
  }
  const paiementDemo = donnees.paiementDemo;
  if (confirmation && !RESULTATS_PAIEMENT_DEMO.includes(paiementDemo as ResultatPaiementDemo)) {
    champs.paiementDemo = `Le paiement de démonstration doit valoir : ${RESULTATS_PAIEMENT_DEMO.join(", ")}.`;
  }

  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return {
    lignes,
    emballageCadeau: donnees.emballageCadeau === true,
    ...(OCCASIONS_CADEAU.includes(occasion as OccasionCadeau) && { occasionCadeau: occasion as OccasionCadeau }),
    ...(adresse && { adresseLivraison: adresse }),
    ...(confirmation && { paiementDemo: paiementDemo as ResultatPaiementDemo }),
  };
}

function lireFiltresVentes(requete: unknown): FiltresVentes {
  const { statut } = lireObjet(requete);
  const champs: ErreursChamps = {};
  if (statut !== undefined && !STATUTS_VENTE.includes(statut as StatutVente)) {
    champs.statut = `Le statut doit être : ${STATUTS_VENTE.join(", ")}.`;
  }
  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return {
    ...(statut !== undefined && { statut: statut as StatutVente }),
  };
}

function versClient({ id, nom, email }: UtilisateurPublic): ClientVente {
  return { id, nom, email };
}

function erreurIntrouvable(message = "Vente introuvable."): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", message);
}

// Mises de côté du client par produit : quantité totale réservée et demandes concernées.
type Reservations = Map<string, { quantite: number; demandeIds: string[] }>;

interface Calcul {
  devis: Devis;
  stocks: Map<string, Stock>;
  reservations: Reservations;
}

export class VenteService {
  constructor(
    private readonly ventes: VenteRepository,
    private readonly produits: ProduitRepository,
    private readonly stocks: StockRepository,
    private readonly parametres: ParametresRepository,
    private readonly demandes: DemandeRepository,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  // Panier : la livraison y est toujours comptée, l'adresse ne sera exigée qu'à la confirmation.
  // Un client connecté voit ses mises de côté comptées comme disponibles.
  async devisEnLigne(corps: unknown, client?: UtilisateurPublic): Promise<Devis> {
    const titulaire = client?.role === "client" ? versClient(client) : undefined;
    return (await this.calculer(lirePanier(corps, false), titulaire)).devis;
  }

  async commanderEnLigne(client: UtilisateurPublic, corps: unknown): Promise<Vente> {
    return this.enregistrer(lirePanier(corps, true), versClient(client));
  }

  // RG12 : article remis en échange d'un retour. C'est une nouvelle commande du même client, expédiée à l'adresse
  // de la commande d'origine, livraison offerte ; le responsable l'enregistre en traitant le retour.
  async commanderEchange(origine: Vente, corps: unknown): Promise<Vente> {
    const panier = {
      ...lirePanier(corps, false),
      ...(origine.adresseLivraison && { adresseLivraison: origine.adresseLivraison }),
    };
    return this.enregistrer(panier, origine.client, true);
  }

  mesCommandes(client: UtilisateurPublic): Promise<Vente[]> {
    return this.ventes.lister({ clientId: client.id });
  }

  async maCommande(client: UtilisateurPublic, id: string): Promise<Vente> {
    const vente = await this.ventes.trouverParId(id);
    if (!vente || vente.client.id !== client.id) {
      throw erreurIntrouvable("Commande introuvable.");
    }
    return vente;
  }

  lister(requete: unknown): Promise<Vente[]> {
    return this.ventes.lister(lireFiltresVentes(requete));
  }

  async obtenir(id: string): Promise<Vente> {
    const vente = await this.ventes.trouverParId(id);
    if (!vente) {
      throw erreurIntrouvable();
    }
    return vente;
  }

  // Commande préparée et confiée au transporteur pour être livrée à l'adresse du client.
  async marquerExpediee(id: string): Promise<Vente> {
    await this.obtenir(id);
    const expediee = await this.ventes.marquerExpediee(id, this.horloge.maintenant());
    if (!expediee) {
      throw new ErreurApi(409, "COMMANDE_DEJA_EXPEDIEE", "Cette commande a déjà été expédiée.");
    }
    return expediee;
  }

  // RG03 : tout ou rien. Les disponibilités sont relues ici, puis le stock est réécrit seulement s'il n'a pas bougé.
  // RG06 : vendre au client titulaire consomme sa mise de côté ; ses demandes passent à honoree et ce qui restait
  // mis de côté pour lui sur ce produit est libéré.
  private async enregistrer(panier: Panier, client: ClientVente, echange = false): Promise<Vente> {
    const { devis, stocks, reservations } = await this.calculer(panier, client, echange);
    if (devis.lignesIndisponibles.length > 0) {
      throw new ErreurApi(
        409,
        "LIGNE_INDISPONIBLE",
        "Certains articles ne sont plus disponibles dans la quantité demandée : rien n'a été enregistré.",
        { lignes: devis.lignesIndisponibles },
      );
    }
    // Le paiement n'est simulé qu'une fois les articles vérifiés, comme un vrai paiement ; refusé, rien n'est écrit.
    if (panier.paiementDemo === "refuse") {
      throw new ErreurApi(402, "PAIEMENT_REFUSE", "Paiement refusé (démonstration) : la commande n'a pas été enregistrée.");
    }
    const date = this.horloge.maintenant();
    const { lignesIndisponibles: _, ...montantsEtLignes } = devis;
    const demandesHonorees = devis.lignes.flatMap(({ produitId }) => reservations.get(produitId)?.demandeIds ?? []);
    const changements: ChangementStock[] = devis.lignes.map(({ produitId, quantite }) => {
      const avant = stocks.get(produitId)!;
      const reserve = reservations.get(produitId)?.quantite ?? 0;
      return {
        produitId,
        avant,
        apres: {
          ...avant,
          quantitePhysique: avant.quantitePhysique - quantite,
          quantiteMiseDeCote: Math.max(0, avant.quantiteMiseDeCote - reserve),
        },
        mouvement: {
          produitId,
          date,
          type: "vente",
          quantite: -quantite,
          motif: echange ? "Échange d'un retour" : "Vente en ligne",
          operateur: echange ? "responsable" : "client",
        },
      };
    });
    try {
      return await this.ventes.creer(
        {
          date,
          statut: "a_preparer",
          client,
          emballageCadeau: panier.emballageCadeau,
          ...(panier.occasionCadeau && { occasionCadeau: panier.occasionCadeau }),
          ...(panier.adresseLivraison && { adresseLivraison: panier.adresseLivraison }),
          ...(panier.paiementDemo === "accepte" && { paiement: { mode: "demo", statut: "accepte", date } }),
          ...montantsEtLignes,
        },
        changements,
        demandesHonorees,
      );
    } catch (erreur) {
      if (erreur instanceof StockModifieErreur) {
        throw new ErreurApi(409, "STOCK_MODIFIE", "Le stock vient de changer : vérifiez le panier et recommencez.");
      }
      throw erreur;
    }
  }

  // Un produit inconnu ou archivé n'est pas chiffré ; un produit connu est chiffré même si son stock manque.
  // Pour le client titulaire, sa mise de côté s'ajoute au stock vendable.
  private async calculer(panier: Panier, client?: ClientVente, livraisonOfferte = false): Promise<Calcul> {
    const aujourdhui = dateDuJour(this.horloge);
    const produitIds = panier.lignes.map((l) => l.produitId);
    const produits = await Promise.all(produitIds.map((id) => this.produits.trouverParId(id)));
    const stocks = await this.stocks.trouverPlusieurs(produitIds);
    const reservations: Reservations = client ? await this.reservations(client.id, produitIds) : new Map();
    const lignes: LigneVente[] = [];
    const lignesIndisponibles: LigneIndisponible[] = [];

    panier.lignes.forEach(({ produitId, quantite }, i) => {
      const produit = produits[i];
      if (!produit || produit.archive) {
        lignesIndisponibles.push({ produitId, quantite });
        return;
      }
      const reserve = reservations.get(produitId)?.quantite ?? 0;
      if (quantite > quantiteVendable(stocks.get(produitId)!) + reserve) {
        lignesIndisponibles.push({ produitId, quantite });
      }
      const remise = promotionDuJour(produit, aujourdhui)?.remise ?? 0;
      const prixUnitaire = prixApplique(produit.prix, remise);
      const montant = prixUnitaire * quantite;
      lignes.push({
        produitId,
        quantite,
        reference: produit.reference,
        designation: produit.designation,
        prixUnitaire,
        remise,
        tauxTva: produit.tauxTva,
        montant,
        montantTva: montantTva(montant, produit.tauxTva),
      });
    });

    const montants = this.montants(lignes, panier, await this.parametres.obtenir(), livraisonOfferte);
    return { devis: { lignes, lignesIndisponibles, ...montants }, stocks, reservations };
  }

  private async reservations(clientId: string, produitIds: string[]): Promise<Reservations> {
    const reservations: Reservations = new Map();
    for (const { id, produitId, miseDeCote } of await this.demandes.misesDeCoteDuClient(clientId, produitIds)) {
      const actuelle = reservations.get(produitId!) ?? { quantite: 0, demandeIds: [] };
      actuelle.quantite += miseDeCote?.quantite ?? 0;
      actuelle.demandeIds.push(id);
      reservations.set(produitId!, actuelle);
    }
    return reservations;
  }

  // RG13 : frais fixes des paramètres, ajoutés au total ; toute commande est livrée, l'échange sans frais de livraison.
  private montants(lignes: LigneVente[], panier: Panier, parametres: Parametres, livraisonOfferte: boolean): Montants {
    const sousTotal = lignes.reduce((somme, l) => somme + l.montant, 0);
    const fraisEmballage = panier.emballageCadeau ? parametres.fraisEmballage : 0;
    const fraisLivraison = livraisonOfferte ? 0 : parametres.fraisLivraison;
    const frais = fraisEmballage + fraisLivraison;
    return {
      sousTotal,
      fraisEmballage,
      fraisLivraison,
      frais,
      montantTva: lignes.reduce((somme, l) => somme + l.montantTva, 0),
      total: sousTotal + frais,
    };
  }
}
