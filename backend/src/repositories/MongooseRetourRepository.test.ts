import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NouveauRetour } from "../modeles/retour.js";
import { STOCK_VIDE, type ChangementStock } from "../modeles/stock.js";
import type { NouvelleVente } from "../modeles/vente.js";
import { MongooseRetourRepository, RetourModel } from "./MongooseRetourRepository.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./MongooseStockRepository.js";
import { MongooseVenteRepository, VenteModel } from "./MongooseVenteRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

function retour(date: string, quantite = 1): NouveauRetour {
  return {
    venteId: "v-1",
    produitId: "p-1",
    reference: "LIV-001",
    designation: "L'Île au trésor",
    quantite,
    date: new Date(date),
    issue: "remboursement",
    revendable: true,
    valeur: 1800 * quantite,
    montantRembourse: 1800 * quantite,
    complementPaye: 0,
  };
}

function remiseEnStock(avant: number, quantite: number, date: string): ChangementStock {
  const stock = { ...STOCK_VIDE, quantitePhysique: avant };
  return {
    produitId: "p-1",
    avant: stock,
    apres: { ...stock, quantitePhysique: avant + quantite },
    mouvement: { produitId: "p-1", date: new Date(date), type: "retour", quantite, motif: "Retour", operateur: "responsable" },
  };
}

function vente(date: string): NouvelleVente {
  return {
    date: new Date(date),
    statut: "expediee",
    client: { id: "c-1", nom: "Marie", email: "marie@example.pf" },
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
}

describe("MongooseRetourRepository", () => {
  let serveur: MongoMemoryReplSet;
  const repository = new MongooseRetourRepository();
  const stocks = new MongooseStockRepository();
  const ventes = new MongooseVenteRepository();

  beforeAll(async () => {
    serveur = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(serveur.getUri());
    await Promise.all([StockModel.init(), MouvementModel.init(), VenteModel.init(), RetourModel.init()]);
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await Promise.all([StockModel.deleteMany({}), MouvementModel.deleteMany({}), VenteModel.deleteMany({}), RetourModel.deleteMany({})]);
    await stocks.enregistrer("p-1", STOCK_VIDE, { ...STOCK_VIDE, quantitePhysique: 2 });
  });

  it("enregistre le retour, son stock et son mouvement lié, dans une transaction", async () => {
    const cree = await repository.creer(retour("2026-11-09T20:00:00Z"), remiseEnStock(2, 1, "2026-11-09T20:00:00Z"));

    await expect(repository.listerDeVente("v-1")).resolves.toEqual([{ ...retour("2026-11-09T20:00:00Z"), id: cree.id }]);
    await expect(stocks.trouver("p-1")).resolves.toMatchObject({ quantitePhysique: 3 });
    const [mouvement] = await stocks.listerMouvements({ type: "retour" });
    expect(mouvement).toMatchObject({ quantite: 1, retourId: cree.id });
  });

  it("n'écrit rien si le stock a changé", async () => {
    await expect(repository.creer(retour("2026-11-09T20:00:00Z"), remiseEnStock(5, 1, "2026-11-09T20:00:00Z"))).rejects.toBeInstanceOf(
      StockModifieErreur,
    );

    await expect(repository.listerDeVente("v-1")).resolves.toEqual([]);
    await expect(stocks.listerMouvements({ type: "retour" })).resolves.toEqual([]);
  });

  it("liste les retours et les ventes d'une période, bornes comprises", async () => {
    await repository.creer(retour("2026-11-01T10:00:00Z"), remiseEnStock(2, 1, "2026-11-01T10:00:00Z"));
    await repository.creer(retour("2026-11-10T10:00:00Z", 2), remiseEnStock(3, 2, "2026-11-10T10:00:00Z"));
    const dedans = await ventes.creer(vente("2026-11-05T10:00:00Z"), []);
    await ventes.creer(vente("2026-11-12T10:00:00Z"), []);
    const debut = new Date("2026-11-01T10:00:00Z");
    const fin = new Date("2026-11-10T10:00:00Z");

    expect((await repository.listerPeriode(debut, fin)).map((r) => r.quantite).sort()).toEqual([1, 2]);
    await expect(repository.listerPeriode(new Date("2026-11-02T00:00:00Z"), new Date("2026-11-09T00:00:00Z"))).resolves.toEqual([]);
    expect((await ventes.listerPeriode(debut, fin)).map((v) => v.id)).toEqual([dedans.id]);
  });

  it("additionne la variation de stock de chaque produit depuis une date (RG08)", async () => {
    await repository.creer(retour("2026-11-01T10:00:00Z"), remiseEnStock(2, 1, "2026-11-01T10:00:00Z"));
    await repository.creer(retour("2026-11-10T10:00:00Z", 2), remiseEnStock(3, 2, "2026-11-10T10:00:00Z"));

    await expect(stocks.variationsDepuis(new Date("2026-11-05T00:00:00Z"))).resolves.toEqual(new Map([["p-1", 2]]));
    await expect(stocks.variationsDepuis(new Date("2026-11-30T00:00:00Z"))).resolves.toEqual(new Map());
  });
});
