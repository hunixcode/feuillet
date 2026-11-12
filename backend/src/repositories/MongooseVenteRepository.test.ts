import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { STOCK_VIDE, type ChangementStock, type Stock } from "../modeles/stock.js";
import type { NouvelleVente, StatutVente } from "../modeles/vente.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./MongooseStockRepository.js";
import { MongooseVenteRepository, VenteModel } from "./MongooseVenteRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

function vente(date: string, quantite: number, statut: StatutVente = "a_preparer", clientId = "c-1"): NouvelleVente {
  return {
    date: new Date(date),
    statut,
    client: { id: clientId, nom: "Marie", email: "marie@example.pf" },
    adresseLivraison: "Papeete",
    emballageCadeau: false,
    lignes: [
      {
        produitId: "p-1",
        quantite,
        reference: "LIV-001",
        designation: "L'Île au trésor",
        prixUnitaire: 1530,
        remise: 15,
        tauxTva: 5,
        montant: 1530 * quantite,
        montantTva: Math.round((1530 * quantite * 5) / 105),
      },
    ],
    sousTotal: 1530 * quantite,
    fraisEmballage: 0,
    fraisLivraison: 800,
    frais: 800,
    montantTva: Math.round((1530 * quantite * 5) / 105),
    total: 1530 * quantite + 800,
  };
}

function sortie(produitId: string, avant: Stock, quantite: number, date: string): ChangementStock {
  return {
    produitId,
    avant,
    apres: { ...avant, quantitePhysique: avant.quantitePhysique - quantite },
    mouvement: { produitId, date: new Date(date), type: "vente", quantite: -quantite, motif: "Vente en ligne", operateur: "client" },
  };
}

describe("MongooseVenteRepository", () => {
  let serveur: MongoMemoryReplSet;
  const repository = new MongooseVenteRepository();
  const stocks = new MongooseStockRepository();
  const cinq = { ...STOCK_VIDE, quantitePhysique: 5 };

  beforeAll(async () => {
    serveur = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(serveur.getUri());
    await Promise.all([StockModel.init(), MouvementModel.init(), VenteModel.init()]);
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await Promise.all([StockModel.deleteMany({}), MouvementModel.deleteMany({}), VenteModel.deleteMany({})]);
    await stocks.enregistrer("p-1", STOCK_VIDE, cinq);
    await stocks.enregistrer("p-2", STOCK_VIDE, cinq);
  });

  it("enregistre la vente, ses stocks et ses mouvements liés à la vente", async () => {
    const creee = await repository.creer(vente("2026-11-08T20:00:00Z", 2), [
      sortie("p-1", cinq, 2, "2026-11-08T20:00:00Z"),
      sortie("p-2", cinq, 1, "2026-11-08T20:00:00Z"),
    ]);

    await expect(repository.trouverParId(creee.id)).resolves.toEqual({ ...vente("2026-11-08T20:00:00Z", 2), id: creee.id });
    await expect(stocks.trouver("p-1")).resolves.toEqual({ ...cinq, quantitePhysique: 3 });
    await expect(stocks.trouver("p-2")).resolves.toEqual({ ...cinq, quantitePhysique: 4 });
    const journal = await stocks.listerMouvements({ type: "vente" });
    expect(journal.map((m) => [m.produitId, m.quantite, m.venteId]).sort()).toEqual([
      ["p-1", -2, creee.id],
      ["p-2", -1, creee.id],
    ]);
  });

  it("n'écrit rien si un seul des stocks a changé entre-temps", async () => {
    await expect(
      repository.creer(vente("2026-11-08T20:00:00Z", 1), [
        sortie("p-1", cinq, 1, "2026-11-08T20:00:00Z"),
        sortie("p-2", { ...cinq, quantitePhysique: 9 }, 1, "2026-11-08T20:00:00Z"),
      ]),
    ).rejects.toBeInstanceOf(StockModifieErreur);

    await expect(stocks.trouver("p-1")).resolves.toEqual(cinq);
    await expect(stocks.listerMouvements({})).resolves.toEqual([]);
    await expect(repository.lister({})).resolves.toEqual([]);
  });

  it("liste du plus récent au plus ancien, filtré par statut et client", async () => {
    const ancienne = await repository.creer(vente("2026-11-01T20:00:00Z", 1), []);
    const recente = await repository.creer(vente("2026-11-05T20:00:00Z", 1, "expediee", "c-2"), []);

    const ids = async (filtres: object) => (await repository.lister(filtres)).map((v) => v.id);
    expect(await ids({})).toEqual([recente.id, ancienne.id]);
    expect(await ids({ statut: "expediee" })).toEqual([recente.id]);
    expect(await ids({ statut: "a_preparer" })).toEqual([ancienne.id]);
    expect(await ids({ clientId: "c-1" })).toEqual([ancienne.id]);
  });

  it("passe une commande à préparer à expédiée une seule fois", async () => {
    const { id } = await repository.creer(vente("2026-11-01T20:00:00Z", 1), []);

    await expect(repository.marquerExpediee(id, new Date("2026-11-02T20:00:00Z"))).resolves.toMatchObject({
      statut: "expediee",
      dateExpedition: new Date("2026-11-02T20:00:00Z"),
    });
    await expect(repository.marquerExpediee(id, new Date("2026-11-03T20:00:00Z"))).resolves.toBeNull();
    await expect(repository.marquerExpediee("inconnu", new Date())).resolves.toBeNull();
    await expect(repository.trouverParId("inconnu")).resolves.toBeNull();
  });
});
