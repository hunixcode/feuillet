import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NouveauProduit } from "../modeles/produit.js";
import { MongooseProduitRepository, ProduitModel } from "./MongooseProduitRepository.js";
import { ReferenceDejaUtiliseeErreur } from "./ProduitRepository.js";

const livre: NouveauProduit = {
  reference: "LIV-001",
  designation: "L'Île au trésor",
  type: "livre",
  categorie: "roman",
  prix: 1800,
  tauxTva: 5,
  archive: false,
  auteur: "Robert Louis Stevenson",
  historiquePrix: [{ date: new Date("2026-10-01T08:00:00Z"), prix: 1800 }],
};

const cahier: NouveauProduit = {
  reference: "PAP-001",
  designation: "Cahier 96 pages",
  type: "papeterie",
  categorie: "scolaire",
  prix: 350,
  tauxTva: 16,
  archive: false,
  marque: "Clairefontaine",
  historiquePrix: [{ date: new Date("2026-10-01T08:00:00Z"), prix: 350 }],
};

describe("MongooseProduitRepository", () => {
  let serveur: MongoMemoryServer;
  const repository = new MongooseProduitRepository();

  beforeAll(async () => {
    serveur = await MongoMemoryServer.create();
    await mongoose.connect(serveur.getUri());
    await ProduitModel.init();
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await serveur?.stop();
  });

  beforeEach(async () => {
    await ProduitModel.deleteMany({});
  });

  it("crée un produit et le retrouve par identifiant, sans champ technique", async () => {
    const cree = await repository.creer(livre);

    expect(cree).toEqual({ ...livre, id: expect.any(String) });
    await expect(repository.trouverParId(cree.id)).resolves.toEqual(cree);
  });

  it("garantit l'unicité de la référence par un index", async () => {
    await repository.creer(livre);

    await expect(repository.creer({ ...cahier, reference: "LIV-001" })).rejects.toBeInstanceOf(
      ReferenceDejaUtiliseeErreur,
    );
  });

  it("filtre par archivage, type et catégorie, trié par désignation", async () => {
    await repository.creer(livre);
    await repository.creer(cahier);
    await repository.creer({ ...livre, reference: "LIV-002", archive: true });

    const actifs = await repository.lister({ archive: false });
    expect(actifs.map((p) => p.reference)).toEqual(["PAP-001", "LIV-001"]);
    await expect(repository.lister({ archive: false, type: "livre" })).resolves.toHaveLength(1);
    await expect(repository.lister({ archive: false, categorie: "scolaire" })).resolves.toHaveLength(1);
    await expect(repository.lister({ archive: true })).resolves.toHaveLength(1);
    await expect(repository.lister({ archive: false, recherche: "STEVENSON" })).resolves.toHaveLength(1);
    await expect(repository.lister({ archive: false, recherche: "cahier (" })).resolves.toHaveLength(0);
    await expect(repository.lister({ archive: false, recherche: ".*" })).resolves.toHaveLength(0);
  });

  it("remplace un produit en entier : les champs absents disparaissent", async () => {
    const cree = await repository.creer(livre);
    const { auteur: _, ...sansAuteur } = cree;
    const historiquePrix = [...livre.historiquePrix, { date: new Date("2026-10-15T08:00:00Z"), prix: 2000 }];

    const remplace = await repository.remplacer({ ...sansAuteur, prix: 2000, historiquePrix });

    expect(remplace).toEqual({ ...sansAuteur, prix: 2000, historiquePrix });
    await expect(repository.trouverParId(cree.id)).resolves.toEqual(remplace);
  });

  it("refuse en remplacement la référence d'un autre produit", async () => {
    const cree = await repository.creer(livre);
    await repository.creer(cahier);

    await expect(repository.remplacer({ ...cree, reference: "PAP-001" })).rejects.toBeInstanceOf(
      ReferenceDejaUtiliseeErreur,
    );
  });

  it("supprime un produit", async () => {
    const cree = await repository.creer(livre);

    await expect(repository.supprimer(cree.id)).resolves.toBe(true);
    await expect(repository.trouverParId(cree.id)).resolves.toBeNull();
    await expect(repository.supprimer(cree.id)).resolves.toBe(false);
  });

  it("gère les identifiants inconnus ou mal formés", async () => {
    const inconnu = new mongoose.Types.ObjectId().toString();

    await expect(repository.trouverParId("pas-un-id")).resolves.toBeNull();
    await expect(repository.remplacer({ ...livre, id: inconnu })).resolves.toBeNull();
    await expect(repository.remplacer({ ...livre, id: "pas-un-id" })).resolves.toBeNull();
    await expect(repository.supprimer("pas-un-id")).resolves.toBe(false);
  });

  it("refuse un type hors énumération et un prix négatif", async () => {
    await expect(repository.creer({ ...livre, type: "jouet" as never })).rejects.toThrow();
    await expect(repository.creer({ ...livre, prix: -1 })).rejects.toThrow();
  });
});
