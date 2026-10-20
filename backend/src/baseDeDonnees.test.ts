import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { verifierMongo } from "./baseDeDonnees.js";

describe("verifierMongo", () => {
  let serveur: MongoMemoryServer;

  beforeAll(async () => {
    serveur = await MongoMemoryServer.create();
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  it("renvoie false tant que la connexion n'est pas ouverte", async () => {
    await expect(verifierMongo()).resolves.toBe(false);
  });

  it("renvoie true quand MongoDB répond", async () => {
    await mongoose.connect(serveur.getUri());

    await expect(verifierMongo()).resolves.toBe(true);
  });

  it("renvoie false si MongoDB ne répond pas dans le délai", async () => {
    const admin = mongoose.connection.db!.admin();
    const pingOriginal = admin.ping.bind(admin);
    const espion = vi
      .spyOn(Object.getPrototypeOf(admin), "ping")
      .mockImplementation(() => new Promise(() => {}));

    await expect(verifierMongo(50)).resolves.toBe(false);

    espion.mockRestore();
    await expect(pingOriginal()).resolves.toBeDefined();
  });

  it("renvoie false après la déconnexion", async () => {
    await mongoose.disconnect();

    await expect(verifierMongo()).resolves.toBe(false);
  });
});
