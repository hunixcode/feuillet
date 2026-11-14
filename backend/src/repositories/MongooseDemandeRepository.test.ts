import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NouvelleDemande, NouvelleNotification, PlanMisesDeCote } from "../modeles/demande.js";
import { STOCK_VIDE } from "../modeles/stock.js";
import { DemandeModel, MongooseDemandeRepository, NotificationModel } from "./MongooseDemandeRepository.js";
import { MongooseNotificationRepository } from "./MongooseNotificationRepository.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./MongooseStockRepository.js";
import { MongooseVenteRepository, VenteModel } from "./MongooseVenteRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

const marie = { id: "c-1", nom: "Marie", email: "marie@example.pf" };
const teva = { id: "c-2", nom: "Teva", email: "teva@example.pf" };

function demande(date: string, options: Partial<NouvelleDemande> = {}): NouvelleDemande {
  return {
    client: marie,
    produitId: "p-1",
    titre: "L'Île au trésor",
    quantiteSouhaitee: 1,
    date: new Date(date),
    statut: "en_attente",
    ...options,
  };
}

function notification(clientId: string, message = "Arrivé"): NouvelleNotification {
  return {
    clientId,
    produitId: "p-1",
    type: "reapprovisionnement",
    date: new Date("2026-11-08T20:00:00Z"),
    message,
    lue: false,
  };
}

const dateLimite = new Date("2026-11-16T09:59:59.999Z");

describe("MongooseDemandeRepository", () => {
  let serveur: MongoMemoryReplSet;
  const repository = new MongooseDemandeRepository();
  const notifications = new MongooseNotificationRepository();
  const stocks = new MongooseStockRepository();
  const deux = { ...STOCK_VIDE, quantitePhysique: 2 };

  beforeAll(async () => {
    serveur = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(serveur.getUri());
    await Promise.all([StockModel.init(), MouvementModel.init(), VenteModel.init(), DemandeModel.init(), NotificationModel.init()]);
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await Promise.all(
      [StockModel, MouvementModel, VenteModel, DemandeModel, NotificationModel].map((m) => (m as typeof StockModel).deleteMany({})),
    );
  });

  function plan(demandeIds: string[], notifs: NouvelleNotification[] = []): PlanMisesDeCote {
    return {
      produitId: "p-1",
      stockApres: { ...deux, quantiteMiseDeCote: demandeIds.length },
      misesDeCote: demandeIds.map((demandeId) => ({ demandeId, miseDeCote: { quantite: 1, dateLimite } })),
      notifications: notifs,
    };
  }

  it("enregistre, relit et liste du plus récent au plus ancien, avec filtres", async () => {
    const ancienne = await repository.creer(demande("2026-11-01T20:00:00Z"));
    const recente = await repository.creer(demande("2026-11-05T20:00:00Z", { client: teva, produitId: undefined, titre: "Autre" }));

    await expect(repository.trouverParId(ancienne.id)).resolves.toEqual(ancienne);
    const ids = async (filtres: object) => (await repository.lister(filtres)).map((d) => d.id);
    expect(await ids({})).toEqual([recente.id, ancienne.id]);
    expect(await ids({ clientId: "c-1" })).toEqual([ancienne.id]);
    expect(await ids({ produitId: "p-1", statut: "en_attente" })).toEqual([ancienne.id]);
    expect((await repository.enAttente("p-1")).map((d) => d.id)).toEqual([ancienne.id]);
    await expect(repository.aDesDemandes("p-1")).resolves.toBe(true);
    await expect(repository.aDesDemandes("p-2")).resolves.toBe(false);
    await expect(repository.trouverParId("inconnue")).resolves.toBeNull();
  });

  it("donne les demandes en attente d'un produit par ordre d'arrivée", async () => {
    const seconde = await repository.creer(demande("2026-11-05T20:00:00Z"));
    const premiere = await repository.creer(demande("2026-11-01T20:00:00Z", { client: teva }));

    expect((await repository.enAttente("p-1")).map((d) => d.id)).toEqual([premiere.id, seconde.id]);
  });

  it("annule une demande en attente une seule fois et rattache une demande hors catalogue", async () => {
    const enAttente = await repository.creer(demande("2026-11-01T20:00:00Z"));
    const horsCatalogue = await repository.creer(demande("2026-11-01T20:00:00Z", { produitId: undefined }));
    const fin = new Date("2026-11-02T20:00:00Z");

    await expect(repository.annuler(enAttente.id, fin)).resolves.toMatchObject({ statut: "annulee", dateFin: fin });
    await expect(repository.annuler(enAttente.id, fin)).resolves.toBeNull();
    await expect(repository.rattacher(enAttente.id, "p-9")).resolves.toBeNull();
    await expect(repository.rattacher(horsCatalogue.id, "p-9")).resolves.toMatchObject({ produitId: "p-9" });
    await expect(repository.rattacher(horsCatalogue.id, "p-8")).resolves.toBeNull();
  });

  it("met de côté, change le stock et crée chaque notification une seule fois, dans une transaction", async () => {
    const d1 = await repository.creer(demande("2026-11-01T20:00:00Z"));
    const d2 = await repository.creer(demande("2026-11-02T20:00:00Z", { client: teva }));

    await repository.mettreDeCote(
      { produitId: "p-1", avant: STOCK_VIDE, apres: { ...deux, quantiteMiseDeCote: 2 } },
      plan([d1.id, d2.id], [notification("c-1"), notification("c-2"), notification("c-1", "En double")]),
    );

    await expect(stocks.trouver("p-1")).resolves.toEqual({ ...deux, quantiteMiseDeCote: 2 });
    await expect(repository.trouverParId(d1.id)).resolves.toMatchObject({
      statut: "mise_de_cote",
      miseDeCote: { quantite: 1, dateLimite },
    });
    const deMarie = await notifications.listerDuClient("c-1");
    expect(deMarie).toEqual([{ ...notification("c-1"), id: expect.any(String) }]);
    await expect(notifications.marquerLue(deMarie[0]!.id, "c-2")).resolves.toBeNull();
    await expect(notifications.marquerLue(deMarie[0]!.id, "c-1")).resolves.toMatchObject({ lue: true });
    await expect(notifications.marquerLue("inconnue", "c-1")).resolves.toBeNull();
  });

  it("n'écrit rien si une demande n'est plus en attente ou si le stock a changé", async () => {
    const d1 = await repository.creer(demande("2026-11-01T20:00:00Z"));
    const annulee = await repository.creer(demande("2026-11-02T20:00:00Z", { statut: "annulee" }));
    const changement = { produitId: "p-1", avant: STOCK_VIDE, apres: { ...deux, quantiteMiseDeCote: 2 } };

    await expect(repository.mettreDeCote(changement, plan([d1.id, annulee.id], [notification("c-1")]))).rejects.toBeInstanceOf(
      StockModifieErreur,
    );
    await stocks.enregistrer("p-1", STOCK_VIDE, deux);
    await expect(repository.mettreDeCote(changement, plan([d1.id]))).rejects.toBeInstanceOf(StockModifieErreur);

    await expect(stocks.trouver("p-1")).resolves.toEqual(deux);
    await expect(repository.trouverParId(d1.id)).resolves.toMatchObject({ statut: "en_attente" });
    await expect(notifications.listerDuClient("c-1")).resolves.toEqual([]);
  });

  it("trouve les mises de côté échues et les expire en libérant le stock, une seule fois", async () => {
    const d1 = await repository.creer(demande("2026-11-01T20:00:00Z"));
    await repository.mettreDeCote(
      { produitId: "p-1", avant: STOCK_VIDE, apres: { ...deux, quantiteMiseDeCote: 1 } },
      { ...plan([d1.id]), stockApres: { ...deux, quantiteMiseDeCote: 1 } },
    );
    const avant = { ...deux, quantiteMiseDeCote: 1 };
    const changement = { produitId: "p-1", avant, apres: deux };
    const apresEcheance = new Date("2026-11-16T10:00:00Z");

    await expect(repository.misesDeCoteEchues(dateLimite)).resolves.toEqual([]);
    expect((await repository.misesDeCoteEchues(apresEcheance)).map((d) => d.id)).toEqual([d1.id]);
    await expect(repository.expirer(d1.id, { ...changement, avant: deux }, apresEcheance)).resolves.toBe(false);
    await expect(repository.trouverParId(d1.id)).resolves.toMatchObject({ statut: "mise_de_cote" });
    await expect(repository.expirer(d1.id, changement, apresEcheance)).resolves.toBe(true);
    await expect(repository.expirer(d1.id, { ...changement, avant: deux, apres: deux }, apresEcheance)).resolves.toBe(false);

    await expect(repository.trouverParId(d1.id)).resolves.toMatchObject({ statut: "expiree", dateFin: apresEcheance });
    await expect(stocks.trouver("p-1")).resolves.toEqual(deux);
    await expect(repository.misesDeCoteEchues(apresEcheance)).resolves.toEqual([]);
  });

  it("passe les mises de côté consommées par une vente à honoree, dans la transaction de la vente", async () => {
    const d1 = await repository.creer(demande("2026-11-01T20:00:00Z"));
    await repository.mettreDeCote(
      { produitId: "p-1", avant: STOCK_VIDE, apres: { ...deux, quantiteMiseDeCote: 1 } },
      { ...plan([d1.id]), stockApres: { ...deux, quantiteMiseDeCote: 1 } },
    );
    expect((await repository.misesDeCoteDuClient("c-1", ["p-1", "p-2"])).map((d) => d.id)).toEqual([d1.id]);
    const ventes = new MongooseVenteRepository();
    const date = new Date("2026-11-09T20:00:00Z");
    const vente = {
      date,
      statut: "a_preparer" as const,
      client: marie,
      adresseLivraison: "Papeete",
      emballageCadeau: false,
      lignes: [],
      sousTotal: 0,
      fraisEmballage: 0,
      fraisLivraison: 0,
      frais: 0,
      montantTva: 0,
      total: 0,
    };
    const changement = {
      produitId: "p-1",
      avant: { ...deux, quantiteMiseDeCote: 1 },
      apres: { ...STOCK_VIDE, quantitePhysique: 1 },
    };

    await expect(ventes.creer(vente, [changement], [new mongoose.Types.ObjectId().toString()])).rejects.toBeInstanceOf(
      StockModifieErreur,
    );
    await expect(stocks.trouver("p-1")).resolves.toEqual({ ...deux, quantiteMiseDeCote: 1 });

    await ventes.creer(vente, [changement], [d1.id]);

    await expect(repository.trouverParId(d1.id)).resolves.toMatchObject({ statut: "honoree", dateFin: date });
    await expect(stocks.trouver("p-1")).resolves.toEqual({ ...STOCK_VIDE, quantitePhysique: 1 });
  });
});
