import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PlanMisesDeCote } from "../modeles/demande.js";
import type { NouvelleCommandeFournisseur } from "../modeles/reappro.js";
import { STOCK_VIDE, type ChangementStock } from "../modeles/stock.js";
import { DemandeModel, MongooseDemandeRepository, NotificationModel } from "./MongooseDemandeRepository.js";
import {
  CommandeFournisseurModel,
  FournisseurModel,
  MongooseCommandeFournisseurRepository,
  MongooseFournisseurRepository,
  MongooseSeuilAlerteRepository,
  ReceptionModel,
  SeuilAlerteModel,
} from "./MongooseReapproRepository.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./MongooseStockRepository.js";
import { CommandeModifieeErreur, ReceptionDejaValideeErreur } from "./ReapproRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

function commande(date: string, options: Partial<NouvelleCommandeFournisseur> = {}): NouvelleCommandeFournisseur {
  return {
    fournisseur: { id: "f-1", nom: "Hachette" },
    produitId: "p-1",
    reference: "LIV-001",
    designation: "L'Île au trésor",
    quantiteCommandee: 5,
    quantiteRecue: 0,
    date: new Date(date),
    dateArriveePrevue: "2026-11-20",
    statut: "en_cours",
    ...options,
  };
}

const date = new Date("2026-11-09T20:00:00Z");

function entree(quantite: number, avant = STOCK_VIDE): ChangementStock {
  return {
    produitId: "p-1",
    avant,
    apres: { ...avant, quantitePhysique: avant.quantitePhysique + quantite },
    mouvement: { produitId: "p-1", date, type: "entree", quantite, motif: "Réception", operateur: "responsable" },
  };
}

function planVide(changement: ChangementStock): PlanMisesDeCote {
  return { produitId: "p-1", stockApres: changement.apres, misesDeCote: [], notifications: [] };
}

describe("MongooseReapproRepository", () => {
  let serveur: MongoMemoryReplSet;
  const fournisseurs = new MongooseFournisseurRepository();
  const commandes = new MongooseCommandeFournisseurRepository();
  const seuils = new MongooseSeuilAlerteRepository();
  const stocks = new MongooseStockRepository();
  const demandes = new MongooseDemandeRepository();
  const modeles = [FournisseurModel, CommandeFournisseurModel, ReceptionModel, SeuilAlerteModel, StockModel, MouvementModel, DemandeModel, NotificationModel];

  beforeAll(async () => {
    serveur = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(serveur.getUri());
    await Promise.all(modeles.map((m) => (m as typeof StockModel).init()));
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await Promise.all(modeles.map((m) => (m as typeof StockModel).deleteMany({})));
  });

  it("crée, remplace et liste les fournisseurs par nom", async () => {
    const hachette = await fournisseurs.creer({ nom: "Hachette" });
    await fournisseurs.creer({ nom: "Archipel", contact: "40 50 60 70" });

    await expect(fournisseurs.remplacer({ ...hachette, contact: "commandes@hachette.pf" })).resolves.toEqual({
      ...hachette,
      contact: "commandes@hachette.pf",
    });
    expect((await fournisseurs.lister()).map((f) => f.nom)).toEqual(["Archipel", "Hachette"]);
    await expect(fournisseurs.trouverParId(hachette.id)).resolves.toMatchObject({ nom: "Hachette" });
    await expect(fournisseurs.remplacer({ id: "inconnu", nom: "X" })).resolves.toBeNull();
  });

  it("liste les commandes, en cours et dernière reçue", async () => {
    const ancienne = await commandes.creer(
      commande("2026-11-01T20:00:00Z", { statut: "recue", quantiteRecue: 5, dateReceptionComplete: new Date("2026-11-03T20:00:00Z") }),
    );
    const plusRecue = await commandes.creer(
      commande("2026-11-02T20:00:00Z", { statut: "recue", quantiteRecue: 5, dateReceptionComplete: new Date("2026-11-05T20:00:00Z") }),
    );
    const enCours = await commandes.creer(commande("2026-11-06T20:00:00Z", { fournisseur: { id: "f-2", nom: "Archipel" } }));

    expect((await commandes.lister({})).map((c) => c.id)).toEqual([enCours.id, plusRecue.id, ancienne.id]);
    expect((await commandes.lister({ fournisseurId: "f-2" })).map((c) => c.id)).toEqual([enCours.id]);
    expect((await commandes.lister({ statut: "recue", produitId: "p-1" })).map((c) => c.id)).toEqual([plusRecue.id, ancienne.id]);
    expect((await commandes.enCours(["p-1"])).map((c) => c.id)).toEqual([enCours.id]);
    await expect(commandes.derniereRecue("p-1")).resolves.toMatchObject({ id: plusRecue.id });
    await expect(commandes.derniereRecue("p-2")).resolves.toBeNull();
    await expect(commandes.aDesCommandes("p-1")).resolves.toBe(true);
    await expect(commandes.trouverParId(enCours.id)).resolves.toEqual(enCours);
  });

  it("valide une réception : réception, commande, stock et mouvement lié, dans une transaction", async () => {
    const { id: commandeId } = await commandes.creer(commande("2026-11-01T20:00:00Z"));
    const reception = await commandes.creerReception({
      commandeId,
      produitId: "p-1",
      date,
      quantiteRecue: 2,
      quantiteAbimee: 1,
      validee: false,
    });
    const changement = entree(2);

    await commandes.validerReception(
      reception.id,
      date,
      { commandeId, quantiteRecueAvant: 0, quantiteRecue: 2, statut: "partiellement_recue" },
      changement,
      planVide(changement),
    );

    await expect(commandes.trouverReception(reception.id)).resolves.toMatchObject({ validee: true, dateValidation: date });
    await expect(commandes.trouverParId(commandeId)).resolves.toMatchObject({ quantiteRecue: 2, statut: "partiellement_recue" });
    await expect(stocks.trouver("p-1")).resolves.toMatchObject({ quantitePhysique: 2 });
    const [mouvement] = await stocks.listerMouvements({ produitId: "p-1" });
    expect(mouvement).toMatchObject({ type: "entree", quantite: 2, receptionId: reception.id });
    expect((await commandes.listerReceptions(commandeId)).map((r) => r.id)).toEqual([reception.id]);
  });

  it("n'écrit rien si la réception est déjà validée, si la commande ou le stock a changé", async () => {
    const { id: commandeId } = await commandes.creer(commande("2026-11-01T20:00:00Z"));
    const nouvelle = () =>
      commandes.creerReception({ commandeId, produitId: "p-1", date, quantiteRecue: 1, quantiteAbimee: 0, validee: false });
    const changement = entree(1);
    const versUn = { commandeId, quantiteRecueAvant: 0, quantiteRecue: 1, statut: "partiellement_recue" as const };

    const premiere = await nouvelle();
    await commandes.validerReception(premiere.id, date, versUn, changement, planVide(changement));
    await expect(commandes.validerReception(premiere.id, date, versUn, entree(1, changement.apres), planVide(changement))).rejects.toBeInstanceOf(
      ReceptionDejaValideeErreur,
    );
    const seconde = await nouvelle();
    await expect(commandes.validerReception(seconde.id, date, versUn, entree(1, changement.apres), planVide(changement))).rejects.toBeInstanceOf(
      CommandeModifieeErreur,
    );
    const versDeux = { ...versUn, quantiteRecueAvant: 1, quantiteRecue: 2 };
    await expect(commandes.validerReception(seconde.id, date, versDeux, entree(1), planVide(entree(1)))).rejects.toBeInstanceOf(
      StockModifieErreur,
    );

    await expect(commandes.trouverReception(seconde.id)).resolves.toMatchObject({ validee: false });
    await expect(commandes.trouverParId(commandeId)).resolves.toMatchObject({ quantiteRecue: 1 });
    await expect(stocks.trouver("p-1")).resolves.toMatchObject({ quantitePhysique: 1 });
    expect(await stocks.listerMouvements({ produitId: "p-1" })).toHaveLength(1);
  });

  it("met de côté les demandes en attente dans la transaction de la réception", async () => {
    const { id: commandeId } = await commandes.creer(commande("2026-11-01T20:00:00Z"));
    const demande = await demandes.creer({
      client: { id: "c-1", nom: "Marie", email: "marie@example.pf" },
      produitId: "p-1",
      titre: "L'Île au trésor",
      quantiteSouhaitee: 1,
      date,
      statut: "en_attente",
    });
    const reception = await commandes.creerReception({ commandeId, produitId: "p-1", date, quantiteRecue: 2, quantiteAbimee: 0, validee: false });
    const changement = { ...entree(2), apres: { ...STOCK_VIDE, quantitePhysique: 2, quantiteMiseDeCote: 1 } };
    const dateLimite = new Date("2026-11-16T09:59:59.999Z");

    await commandes.validerReception(
      reception.id,
      date,
      { commandeId, quantiteRecueAvant: 0, quantiteRecue: 2, statut: "partiellement_recue" },
      changement,
      {
        produitId: "p-1",
        stockApres: changement.apres,
        misesDeCote: [{ demandeId: demande.id, miseDeCote: { quantite: 1, dateLimite } }],
        notifications: [{ clientId: "c-1", produitId: "p-1", type: "reapprovisionnement", date, message: "Arrivé", lue: false }],
      },
    );

    await expect(demandes.trouverParId(demande.id)).resolves.toMatchObject({ statut: "mise_de_cote", miseDeCote: { quantite: 1 } });
    await expect(stocks.trouver("p-1")).resolves.toEqual({ ...STOCK_VIDE, quantitePhysique: 2, quantiteMiseDeCote: 1 });
    expect(await NotificationModel.countDocuments()).toBe(1);
  });

  it("règle et efface le seuil d'alerte d'un produit", async () => {
    await seuils.definir("p-1", 30);
    await seuils.definir("p-1", 40);
    await seuils.definir("p-2", 10);
    await seuils.definir("p-2", null);

    await expect(seuils.seuils(["p-1", "p-2", "p-3"])).resolves.toEqual(new Map([["p-1", 40]]));
  });

  it("donne le stock initial d'après le premier mouvement", async () => {
    await expect(stocks.stockInitial("p-1")).resolves.toBeUndefined();
    await stocks.enregistrer("p-1", STOCK_VIDE, { ...STOCK_VIDE, quantitePhysique: 8 }, {
      produitId: "p-1",
      date: new Date("2026-11-01T20:00:00Z"),
      type: "ajustement",
      quantite: 8,
      motif: "Stock initial",
      operateur: "responsable",
      quantiteAvant: 0,
      quantiteApres: 8,
    });
    const changement = entree(2, { ...STOCK_VIDE, quantitePhysique: 8 });
    await stocks.enregistrer("p-1", changement.avant, changement.apres, changement.mouvement);

    await expect(stocks.stockInitial("p-1")).resolves.toBe(8);
  });
});
