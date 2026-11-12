import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PARAMETRES_DEPART } from "../modeles/parametres.js";
import { MongooseParametresRepository, ParametresModel } from "./MongooseParametresRepository.js";

describe("MongooseParametresRepository", () => {
  let serveur: MongoMemoryServer;
  const repository = new MongooseParametresRepository();
  const reglages = { ...PARAMETRES_DEPART, fraisLivraison: 1200, seuilAlerteDefaut: 30 };

  beforeAll(async () => {
    serveur = await MongoMemoryServer.create();
    await mongoose.connect(serveur.getUri());
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await ParametresModel.deleteMany({});
  });

  it("donne les valeurs de départ quand la base est vide", async () => {
    await expect(repository.obtenir()).resolves.toEqual(PARAMETRES_DEPART);
  });

  it("garde un seul document, remplacé à chaque enregistrement", async () => {
    await repository.enregistrer(PARAMETRES_DEPART);
    await repository.enregistrer(reglages);

    await expect(repository.obtenir()).resolves.toEqual(reglages);
    await expect(ParametresModel.countDocuments()).resolves.toBe(1);
  });

  it("initialise sans écraser les valeurs réglées par le responsable", async () => {
    await repository.initialiser();
    await expect(repository.obtenir()).resolves.toEqual(PARAMETRES_DEPART);

    await repository.enregistrer(reglages);
    await repository.initialiser();

    await expect(repository.obtenir()).resolves.toEqual(reglages);
  });

  it("refuse une valeur nulle", async () => {
    await expect(repository.enregistrer({ ...reglages, delaiRetourJours: 0 })).rejects.toThrow();
  });
});
