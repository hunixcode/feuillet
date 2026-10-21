import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CategorieDejaExistanteErreur } from "./CategorieRepository.js";
import { CategorieModel, MongooseCategorieRepository } from "./MongooseCategorieRepository.js";

describe("MongooseCategorieRepository", () => {
  let serveur: MongoMemoryServer;
  const repository = new MongooseCategorieRepository();

  beforeAll(async () => {
    serveur = await MongoMemoryServer.create();
    await mongoose.connect(serveur.getUri());
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await CategorieModel.deleteMany({});
  });

  it("crée, liste par libellé, renomme et supprime", async () => {
    const roman = { id: "roman", libelle: "Roman" };
    await expect(repository.creer(roman)).resolves.toEqual(roman);
    await repository.creer({ id: "jeunesse", libelle: "Jeunesse" });

    await expect(repository.lister()).resolves.toEqual([
      { id: "jeunesse", libelle: "Jeunesse" },
      { id: "roman", libelle: "Roman" },
    ]);
    await expect(repository.renommer("roman", "Romans")).resolves.toEqual({ id: "roman", libelle: "Romans" });
    await expect(repository.trouverParId("roman")).resolves.toEqual({ id: "roman", libelle: "Romans" });
    await expect(repository.supprimer("roman")).resolves.toBe(true);
    await expect(repository.supprimer("roman")).resolves.toBe(false);
  });

  it("refuse un identifiant déjà pris", async () => {
    await repository.creer({ id: "roman", libelle: "Roman" });

    await expect(repository.creer({ id: "roman", libelle: "Autre" })).rejects.toBeInstanceOf(
      CategorieDejaExistanteErreur,
    );
  });

  it("renvoie null pour une catégorie inconnue", async () => {
    await expect(repository.trouverParId("inconnue")).resolves.toBeNull();
    await expect(repository.renommer("inconnue", "Nom")).resolves.toBeNull();
  });
});
