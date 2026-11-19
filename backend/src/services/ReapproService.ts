import { ErreurApi } from "../erreurs.js";
import { dateDuJour, horlogeSysteme, type Horloge } from "../horloge.js";
import {
  STATUTS_COMMANDE_FOURNISSEUR,
  restantARecevoir,
  statutCommande,
  type CommandeFournisseur,
  type FiltresCommandesFournisseur,
  type Fournisseur,
  type NouveauFournisseur,
  type ProduitARecommander,
  type Reception,
  type SeuilProduit,
  type StatutCommandeFournisseur,
} from "../modeles/reappro.js";
import { quantiteVendable, type ChangementStock } from "../modeles/stock.js";
import type { ParametresRepository } from "../repositories/ParametresRepository.js";
import type { ProduitRepository } from "../repositories/ProduitRepository.js";
import {
  CommandeModifieeErreur,
  ReceptionDejaValideeErreur,
  type CommandeFournisseurRepository,
  type FournisseurRepository,
  type SeuilAlerteRepository,
} from "../repositories/ReapproRepository.js";
import { StockModifieErreur, type StockRepository } from "../repositories/StockRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";
import type { DemandeService } from "./DemandeService.js";

const LONGUEUR_MAX_NOM = 100;
const LONGUEUR_MAX_CONTACT = 200;
const QUANTITE_MAX = 9999;
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function estEntier(valeur: unknown, min: number, max: number): valeur is number {
  return Number.isInteger(valeur) && (valeur as number) >= min && (valeur as number) <= max;
}

function estDateValide(texte: string): boolean {
  return FORMAT_DATE.test(texte) && new Date(`${texte}T00:00:00Z`).toISOString().startsWith(texte);
}

function lireFournisseur(corps: unknown): NouveauFournisseur {
  const donnees = lireObjet(corps);
  const nom = lireTexte(donnees.nom);
  const contact = lireTexte(donnees.contact);
  const champs: ErreursChamps = {};
  if (!nom) {
    champs.nom = "Le nom est obligatoire.";
  } else if (nom.length > LONGUEUR_MAX_NOM) {
    champs.nom = `Le nom ne doit pas dépasser ${LONGUEUR_MAX_NOM} caractères.`;
  }
  if (contact.length > LONGUEUR_MAX_CONTACT) {
    champs.contact = `Le contact ne doit pas dépasser ${LONGUEUR_MAX_CONTACT} caractères.`;
  }
  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return { nom, ...(contact && { contact }) };
}

function lireFiltres(requete: unknown): FiltresCommandesFournisseur {
  const { statut, produitId, fournisseurId } = lireObjet(requete);
  if (statut !== undefined && !STATUTS_COMMANDE_FOURNISSEUR.includes(statut as StatutCommandeFournisseur)) {
    throw erreurValidation({ statut: `Le statut doit être : ${STATUTS_COMMANDE_FOURNISSEUR.join(", ")}.` });
  }
  return {
    ...(statut !== undefined && { statut: statut as StatutCommandeFournisseur }),
    ...(typeof produitId === "string" && produitId && { produitId }),
    ...(typeof fournisseurId === "string" && fournisseurId && { fournisseurId }),
  };
}

function erreurIntrouvable(message: string): ErreurApi {
  return new ErreurApi(404, "INTROUVABLE", message);
}

function erreurRestant(restant: number): ErreurApi {
  return new ErreurApi(
    409,
    "QUANTITE_SUPERIEURE_AU_RESTANT",
    `La quantité reçue dépasse ce qui reste à recevoir (${restant}).`,
    { restant },
  );
}

export interface ReceptionValidee {
  reception: Reception;
  commande: CommandeFournisseur;
}

// EX06 : fournisseurs, commandes fournisseur, réceptions et produits à recommander (RG07, RG10, décisions 19 et 20).
export class ReapproService {
  constructor(
    private readonly fournisseurs: FournisseurRepository,
    private readonly commandes: CommandeFournisseurRepository,
    private readonly seuils: SeuilAlerteRepository,
    private readonly produits: ProduitRepository,
    private readonly stocks: StockRepository,
    private readonly parametres: ParametresRepository,
    private readonly demandes: DemandeService,
    private readonly horloge: Horloge = horlogeSysteme,
  ) {}

  listerFournisseurs(): Promise<Fournisseur[]> {
    return this.fournisseurs.lister();
  }

  async creerFournisseur(corps: unknown): Promise<Fournisseur> {
    return this.fournisseurs.creer(lireFournisseur(corps));
  }

  async modifierFournisseur(id: string, corps: unknown): Promise<Fournisseur> {
    const modifie = await this.fournisseurs.remplacer({ ...lireFournisseur(corps), id });
    if (!modifie) {
      throw erreurIntrouvable("Fournisseur introuvable.");
    }
    return modifie;
  }

  async creerCommande(corps: unknown): Promise<CommandeFournisseur> {
    const donnees = lireObjet(corps);
    const champs: ErreursChamps = {};
    const fournisseur = await this.fournisseurs.trouverParId(lireTexte(donnees.fournisseurId));
    if (!fournisseur) {
      champs.fournisseurId = "Fournisseur introuvable.";
    }
    const produit = await this.produits.trouverParId(lireTexte(donnees.produitId));
    if (!produit || produit.archive) {
      champs.produitId = "Produit introuvable ou archivé.";
    }
    if (!estEntier(donnees.quantiteCommandee, 1, QUANTITE_MAX)) {
      champs.quantiteCommandee = `La quantité doit être un nombre entier entre 1 et ${QUANTITE_MAX}.`;
    }
    const dateArriveePrevue = lireTexte(donnees.dateArriveePrevue);
    if (!estDateValide(dateArriveePrevue)) {
      champs.dateArriveePrevue = "La date d'arrivée prévue doit être une date valide au format AAAA-MM-JJ.";
    } else if (dateArriveePrevue < dateDuJour(this.horloge)) {
      champs.dateArriveePrevue = "La date d'arrivée prévue ne peut pas être passée.";
    }
    if (Object.keys(champs).length > 0) {
      throw erreurValidation(champs);
    }
    return this.commandes.creer({
      fournisseur: { id: fournisseur!.id, nom: fournisseur!.nom },
      produitId: produit!.id,
      reference: produit!.reference,
      designation: produit!.designation,
      quantiteCommandee: donnees.quantiteCommandee as number,
      quantiteRecue: 0,
      date: this.horloge.maintenant(),
      dateArriveePrevue,
      statut: "en_cours",
    });
  }

  async listerCommandes(requete: unknown): Promise<CommandeFournisseur[]> {
    return this.commandes.lister(lireFiltres(requete));
  }

  async obtenirCommande(id: string): Promise<CommandeFournisseur> {
    const commande = await this.commandes.trouverParId(id);
    if (!commande) {
      throw erreurIntrouvable("Commande fournisseur introuvable.");
    }
    return commande;
  }

  async listerReceptions(commandeId: string): Promise<Reception[]> {
    await this.obtenirCommande(commandeId);
    return this.commandes.listerReceptions(commandeId);
  }

  // Saisie d'une réception, éventuellement partielle ; le stock n'entre qu'à la validation.
  async enregistrerReception(commandeId: string, corps: unknown): Promise<Reception> {
    const commande = await this.obtenirCommande(commandeId);
    const donnees = lireObjet(corps);
    const quantiteAbimee = donnees.quantiteAbimee === undefined ? 0 : donnees.quantiteAbimee;
    const champs: ErreursChamps = {};
    if (!estEntier(donnees.quantiteRecue, 0, QUANTITE_MAX)) {
      champs.quantiteRecue = "La quantité reçue doit être un nombre entier positif ou nul.";
    }
    if (!estEntier(quantiteAbimee, 0, QUANTITE_MAX)) {
      champs.quantiteAbimee = "La quantité abîmée doit être un nombre entier positif ou nul.";
    }
    if (Object.keys(champs).length === 0 && (donnees.quantiteRecue as number) + (quantiteAbimee as number) === 0) {
      champs.quantiteRecue = "La réception doit compter au moins un article.";
    }
    if (Object.keys(champs).length > 0) {
      throw erreurValidation(champs);
    }
    if (commande.statut === "recue") {
      throw new ErreurApi(409, "COMMANDE_DEJA_RECUE", "Cette commande fournisseur est déjà entièrement reçue.");
    }
    if ((donnees.quantiteRecue as number) > restantARecevoir(commande)) {
      throw erreurRestant(restantARecevoir(commande));
    }
    return this.commandes.creerReception({
      commandeId,
      produitId: commande.produitId,
      date: this.horloge.maintenant(),
      quantiteRecue: donnees.quantiteRecue as number,
      quantiteAbimee: quantiteAbimee as number,
      validee: false,
    });
  }

  // Diagramme de séquence de la réception : entrée en stock, commande mise à jour, demandes en attente mises de côté
  // et clients prévenus, dans une seule transaction. Une réception validée deux fois ne crée pas de second mouvement.
  async validerReception(receptionId: string): Promise<ReceptionValidee> {
    const reception = await this.commandes.trouverReception(receptionId);
    if (!reception) {
      throw erreurIntrouvable("Réception introuvable.");
    }
    if (reception.validee) {
      throw this.erreurDejaValidee();
    }
    const commande = await this.obtenirCommande(reception.commandeId);
    if (reception.quantiteRecue > restantARecevoir(commande)) {
      throw erreurRestant(restantARecevoir(commande));
    }

    const date = this.horloge.maintenant();
    const quantiteRecue = commande.quantiteRecue + reception.quantiteRecue;
    const statut = statutCommande(commande.quantiteCommandee, quantiteRecue);
    const avant = await this.stocks.trouver(commande.produitId);
    const apresEntree = { ...avant, quantitePhysique: avant.quantitePhysique + reception.quantiteRecue };
    const plan = await this.demandes.planifierMisesDeCote(commande.produitId, apresEntree);
    const changement: ChangementStock = {
      produitId: commande.produitId,
      avant,
      apres: plan.stockApres,
      ...(reception.quantiteRecue > 0 && {
        mouvement: {
          produitId: commande.produitId,
          date,
          type: "entree",
          quantite: reception.quantiteRecue,
          motif: `Réception de la commande fournisseur (${commande.fournisseur.nom})`,
          operateur: "responsable",
        },
      }),
    };
    try {
      await this.commandes.validerReception(
        receptionId,
        date,
        {
          commandeId: commande.id,
          quantiteRecueAvant: commande.quantiteRecue,
          quantiteRecue,
          statut,
          ...(statut === "recue" && { dateReceptionComplete: date }),
        },
        changement,
        plan,
      );
    } catch (erreur) {
      if (erreur instanceof ReceptionDejaValideeErreur) {
        throw this.erreurDejaValidee();
      }
      if (erreur instanceof StockModifieErreur || erreur instanceof CommandeModifieeErreur) {
        throw new ErreurApi(409, "STOCK_MODIFIE", "Le stock ou la commande vient de changer : recommencez.");
      }
      throw erreur;
    }
    return {
      reception: { ...reception, validee: true, dateValidation: date },
      commande: (await this.commandes.trouverParId(commande.id))!,
    };
  }

  // RG10 : seuil d'alerte de chaque produit, actif ou archivé, pour le catalogue du responsable.
  async listerSeuils(): Promise<SeuilProduit[]> {
    const produits = [
      ...(await this.produits.lister({ archive: false })),
      ...(await this.produits.lister({ archive: true })),
    ];
    const [seuils, { seuilAlerteDefaut }] = await Promise.all([
      this.seuils.seuils(produits.map((p) => p.id)),
      this.parametres.obtenir(),
    ]);
    return produits.map((produit) => {
      const seuil = seuils.get(produit.id);
      return { produitId: produit.id, seuilAlerte: seuil ?? seuilAlerteDefaut, parDefaut: seuil === undefined };
    });
  }

  // RG10 : seuil d'alerte d'un produit, le sien ou celui des paramètres.
  async obtenirSeuil(produitId: string): Promise<{ seuilAlerte: number; parDefaut: boolean }> {
    if (!(await this.produits.trouverParId(produitId))) {
      throw erreurIntrouvable("Produit introuvable.");
    }
    const seuil = (await this.seuils.seuils([produitId])).get(produitId);
    if (seuil === undefined) {
      return { seuilAlerte: (await this.parametres.obtenir()).seuilAlerteDefaut, parDefaut: true };
    }
    return { seuilAlerte: seuil, parDefaut: false };
  }

  // RG10 : réglage du seuil d'alerte d'un produit ; null revient au seuil par défaut des paramètres.
  async definirSeuil(produitId: string, corps: unknown): Promise<{ seuilAlerte: number; parDefaut: boolean }> {
    if (!(await this.produits.trouverParId(produitId))) {
      throw erreurIntrouvable("Produit introuvable.");
    }
    const { seuilAlerte } = lireObjet(corps);
    if (seuilAlerte !== null && !estEntier(seuilAlerte, 0, 100)) {
      throw erreurValidation({ seuilAlerte: "Le seuil d'alerte doit être un entier entre 0 et 100, ou null." });
    }
    await this.seuils.definir(produitId, seuilAlerte as number | null);
    if (seuilAlerte === null) {
      return { seuilAlerte: (await this.parametres.obtenir()).seuilAlerteDefaut, parDefaut: true };
    }
    return { seuilAlerte: seuilAlerte as number, parDefaut: false };
  }

  // RG10 : vendable ≤ seuil × quantité achetée à l'origine (total reçu de la dernière commande reçue, à défaut le stock
  // initial). Un produit sans quantité achetée connue n'est pas évalué. Du plus urgent au moins urgent.
  async aRecommander(): Promise<ProduitARecommander[]> {
    const produits = await this.produits.lister({ archive: false });
    const ids = produits.map((p) => p.id);
    const [stocks, seuils, enCours, { seuilAlerteDefaut }] = await Promise.all([
      this.stocks.trouverPlusieurs(ids),
      this.seuils.seuils(ids),
      this.commandes.enCours(ids),
      this.parametres.obtenir(),
    ]);
    const resultat: ProduitARecommander[] = [];
    for (const produit of produits) {
      const quantiteAcheteeOrigine = await this.quantiteAcheteeOrigine(produit.id);
      if (quantiteAcheteeOrigine <= 0) {
        continue;
      }
      const seuilAlerte = seuils.get(produit.id) ?? seuilAlerteDefaut;
      const vendable = quantiteVendable(stocks.get(produit.id)!);
      if (vendable > (seuilAlerte / 100) * quantiteAcheteeOrigine) {
        continue;
      }
      resultat.push({
        produitId: produit.id,
        reference: produit.reference,
        designation: produit.designation,
        quantiteVendable: vendable,
        quantiteAcheteeOrigine,
        seuilAlerte,
        pourcentageVendu: Math.min(100, Math.max(0, Math.round(((quantiteAcheteeOrigine - vendable) / quantiteAcheteeOrigine) * 100))),
        quantiteEnCommande: enCours
          .filter((c) => c.produitId === produit.id)
          .reduce((somme, c) => somme + restantARecevoir(c), 0),
      });
    }
    return resultat.sort((a, b) => b.pourcentageVendu - a.pourcentageVendu || a.designation.localeCompare(b.designation, "fr"));
  }

  // RG10 : total reçu de la dernière commande fournisseur reçue, à défaut le stock initial ; 0 si inconnue.
  async quantiteAcheteeOrigine(produitId: string): Promise<number> {
    return (
      (await this.commandes.derniereRecue(produitId))?.quantiteRecue ?? (await this.stocks.stockInitial(produitId)) ?? 0
    );
  }

  // EX04 : date d'arrivée prévue la plus proche des commandes en cours, par produit.
  async arriveesPrevues(produitIds: string[]): Promise<Map<string, string>> {
    const arrivees = new Map<string, string>();
    for (const { produitId, dateArriveePrevue } of await this.commandes.enCours(produitIds)) {
      const actuelle = arrivees.get(produitId);
      if (!actuelle || dateArriveePrevue < actuelle) {
        arrivees.set(produitId, dateArriveePrevue);
      }
    }
    return arrivees;
  }

  aDesCommandes(produitId: string): Promise<boolean> {
    return this.commandes.aDesCommandes(produitId);
  }

  private erreurDejaValidee(): ErreurApi {
    return new ErreurApi(409, "RECEPTION_DEJA_VALIDEE", "Cette réception est déjà validée : aucun mouvement n'a été créé.");
  }
}
