import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { STOCK_VIDE, type NouveauMouvement } from "../modeles/stock.js";
import { MongooseStockRepository, MouvementModel, StockModel } from "./MongooseStockRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

function ajustement(produitId: string, avant: number, apres: number, date: string): NouveauMouvement {
  return {
    produitId,
    date: new Date(date),
    type: "ajustement",
    quantite: apres - avant,
    motif: "Comptage",
    operateur: "responsable",
    quantiteAvant: avant,
    quantiteApres: apres,
  };
}

describe("MongooseStockRepository", () => {
  let serveur: MongoMemoryReplSet;
  const repository = new MongooseStockRepository();
  const cinq = { ...STOCK_VIDE, quantitePhysique: 5 };

  beforeAll(async () => {
    serveur = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(serveur.getUri());
    await StockModel.init();
    await MouvementModel.init();
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await StockModel.deleteMany({});
    await MouvementModel.deleteMany({});
  });

  it("donne un stock vide à un produit jamais compté", async () => {
    await expect(repository.trouver("p-1")).resolves.toEqual(STOCK_VIDE);
    await expect(repository.aDesMouvements("p-1")).resolves.toBe(false);
  });

  it("enregistre le stock et son mouvement ensemble", async () => {
    await repository.enregistrer("p-1", STOCK_VIDE, cinq, ajustement("p-1", 0, 5, "2026-10-22T08:00:00Z"));

    await expect(repository.trouver("p-1")).resolves.toEqual(cinq);
    await expect(repository.trouverPlusieurs(["p-1", "p-2"])).resolves.toEqual(
      new Map([
        ["p-1", cinq],
        ["p-2", STOCK_VIDE],
      ]),
    );
    await expect(repository.listerMouvements({ produitId: "p-1" })).resolves.toEqual([
      { ...ajustement("p-1", 0, 5, "2026-10-22T08:00:00Z"), id: expect.any(String) },
    ]);
    await expect(repository.aDesMouvements("p-1")).resolves.toBe(true);
  });

  it("refuse une écriture faite sur un stock périmé, sans garder le mouvement", async () => {
    await repository.enregistrer("p-1", STOCK_VIDE, cinq);

    await expect(
      repository.enregistrer("p-1", STOCK_VIDE, { ...cinq, quantitePhysique: 9 }, ajustement("p-1", 0, 9, "2026-10-22T08:00:00Z")),
    ).rejects.toBeInstanceOf(StockModifieErreur);
    await expect(repository.trouver("p-1")).resolves.toEqual(cinq);
    await expect(repository.aDesMouvements("p-1")).resolves.toBe(false);
  });

  it("liste le journal du plus récent au plus ancien, filtré par produit et par type", async () => {
    await repository.enregistrer("p-1", STOCK_VIDE, cinq, ajustement("p-1", 0, 5, "2026-10-20T08:00:00Z"));
    await repository.enregistrer("p-2", STOCK_VIDE, cinq, ajustement("p-2", 0, 5, "2026-10-21T08:00:00Z"));

    const journal = await repository.listerMouvements({});

    expect(journal.map((m) => m.produitId)).toEqual(["p-2", "p-1"]);
    await expect(repository.listerMouvements({ type: "vente" })).resolves.toEqual([]);
  });
});
