import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { EmailDejaUtiliseErreur } from "./UtilisateurRepository.js";
import { MongooseUtilisateurRepository, UtilisateurModel } from "./MongooseUtilisateurRepository.js";

const client = {
  nom: "Hina",
  email: "hina@example.pf",
  motDePasseHash: "hash",
  role: "client" as const,
  typeClient: "jeunesse" as const,
};

describe("MongooseUtilisateurRepository", () => {
  let serveur: MongoMemoryServer;
  const repository = new MongooseUtilisateurRepository();

  beforeAll(async () => {
    serveur = await MongoMemoryServer.create();
    await mongoose.connect(serveur.getUri());
    await UtilisateurModel.init();
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await UtilisateurModel.deleteMany({});
  });

  it("crée un utilisateur et le retrouve par e-mail et par identifiant", async () => {
    const cree = await repository.creer(client);

    expect(cree).toEqual({ ...client, id: expect.any(String) });
    await expect(repository.trouverParEmail("hina@example.pf")).resolves.toEqual(cree);
    await expect(repository.trouverParId(cree.id)).resolves.toEqual(cree);
  });

  it("n'ajoute pas de typeClient à un responsable", async () => {
    const { typeClient: _, ...sansType } = client;
    const cree = await repository.creer({ ...sansType, role: "responsable" });

    expect(cree).not.toHaveProperty("typeClient");
  });

  it("garantit l'unicité de l'e-mail par un index", async () => {
    await repository.creer(client);

    await expect(repository.creer({ ...client, nom: "Autre" })).rejects.toBeInstanceOf(
      EmailDejaUtiliseErreur,
    );
  });

  it("renvoie null pour un e-mail ou un identifiant inconnu", async () => {
    await expect(repository.trouverParEmail("inconnu@example.pf")).resolves.toBeNull();
    await expect(repository.trouverParId(new mongoose.Types.ObjectId().toString())).resolves.toBeNull();
  });

  it("renvoie null pour un identifiant qui n'est pas un ObjectId", async () => {
    await expect(repository.trouverParId("pas-un-id")).resolves.toBeNull();
  });

  it("refuse un rôle ou un type de client hors énumération", async () => {
    await expect(repository.creer({ ...client, role: "employe" as never })).rejects.toThrow();
    await expect(
      repository.creer({ ...client, typeClient: "retraite" as never }),
    ).rejects.toThrow();
  });
});
