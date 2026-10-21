import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireProduitRepository } from "../repositories/MemoireProduitRepository.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { ProduitService } from "../services/ProduitService.js";

const livre = {
  reference: "LIV-001",
  designation: "L'Île au trésor",
  type: "livre",
  categorie: "roman",
  prix: 1800,
  tauxTva: 5,
  isbn: "9782070612758",
  auteur: "Robert Louis Stevenson",
};

const magazine = {
  reference: "MAG-001",
  designation: "Fenua Mag n° 12",
  type: "magazine",
  categorie: "presse",
  prix: 900,
  tauxTva: 5,
  issn: "1234-5678",
  numero: 12,
  dateParution: "2026-10-01",
};

describe("API des produits", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;
  let horloge: { date: Date; maintenant: () => Date };

  beforeEach(async () => {
    horloge = { date: new Date("2026-10-15T08:00:00Z"), maintenant: () => horloge.date };
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4 });
    app = createApp({
      authService,
      produitService: new ProduitService(new MemoireProduitRepository(), horloge),
      verifierBase: async () => true,
    });

    await utilisateurs.creer({
      nom: "Responsable",
      email: "responsable@librairie.pf",
      motDePasseHash: await hasherMotDePasse("responsable123", 4),
      role: "responsable",
    });
    ({ token: tokenResponsable } = await authService.connecter({
      email: "responsable@librairie.pf",
      motDePasse: "responsable123",
    }));
    ({ token: tokenClient } = await authService.inscrire({
      nom: "Client",
      email: "client@example.pf",
      motDePasse: "motdepasse123",
    }));
  });

  function creer(produit: object) {
    return request(app)
      .post("/api/produits")
      .set("Authorization", `Bearer ${tokenResponsable}`)
      .send(produit);
  }

  describe("POST /api/produits", () => {
    it("répond 201 avec le produit créé, non archivé", async () => {
      const reponse = await creer(livre);

      expect(reponse.status).toBe(201);
      expect(reponse.body).toEqual({ ...livre, id: expect.any(String), archive: false });
    });

    it("ne garde que les champs propres au type", async () => {
      const reponse = await creer({ ...magazine, isbn: "9782070612758", marque: "Bic" });

      expect(reponse.status).toBe(201);
      expect(reponse.body).not.toHaveProperty("isbn");
      expect(reponse.body).not.toHaveProperty("marque");
      expect(reponse.body).toMatchObject({ issn: "1234-5678", numero: 12, dateParution: "2026-10-01" });
    });

    it("répond 400 avec le détail des champs invalides", async () => {
      const reponse = await creer({ type: "jouet", prix: -1, tauxTva: 12.5 });

      expect(reponse.status).toBe(400);
      expect(reponse.body).toEqual({
        code: "VALIDATION",
        message: expect.any(String),
        details: {
          champs: {
            reference: expect.any(String),
            designation: expect.any(String),
            categorie: expect.any(String),
            type: expect.any(String),
            prix: expect.any(String),
            tauxTva: expect.any(String),
          },
        },
      });
    });

    it("refuse un prix non entier et une date de parution invalide", async () => {
      const reponse = await creer({ ...magazine, prix: 900.5, dateParution: "2026-02-30" });

      expect(reponse.status).toBe(400);
      expect(Object.keys(reponse.body.details.champs)).toEqual(["prix", "dateParution"]);
    });

    it("répond 409 si la référence est déjà utilisée", async () => {
      await creer(livre).expect(201);

      const reponse = await creer({ ...livre, designation: "Autre" });

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe("REFERENCE_DEJA_UTILISEE");
      expect(reponse.body.details.champs.reference).toEqual(expect.any(String));
    });

    it("répond 401 sans token et 403 pour un client", async () => {
      await request(app).post("/api/produits").send(livre).expect(401);
      const reponse = await request(app)
        .post("/api/produits")
        .set("Authorization", `Bearer ${tokenClient}`)
        .send(livre);

      expect(reponse.status).toBe(403);
      expect(reponse.body.code).toBe("ACCES_REFUSE");
    });
  });

  describe("GET /api/produits", () => {
    beforeEach(async () => {
      await creer(livre).expect(201);
      await creer(magazine).expect(201);
      await creer({ ...livre, reference: "LIV-002", designation: "Ancien", archive: true }).expect(201);
    });

    it("liste les produits non archivés sans authentification, triés par désignation", async () => {
      const reponse = await request(app).get("/api/produits");

      expect(reponse.status).toBe(200);
      expect(reponse.body.map((p: { reference: string }) => p.reference)).toEqual(["MAG-001", "LIV-001"]);
    });

    it("filtre par type, par catégorie et sur les archivés", async () => {
      const parType = await request(app).get("/api/produits?type=livre");
      const parCategorie = await request(app).get("/api/produits?categorie=presse");
      const archives = await request(app).get("/api/produits?archive=true");

      expect(parType.body.map((p: { reference: string }) => p.reference)).toEqual(["LIV-001"]);
      expect(parCategorie.body.map((p: { reference: string }) => p.reference)).toEqual(["MAG-001"]);
      expect(archives.body.map((p: { reference: string }) => p.reference)).toEqual(["LIV-002"]);
    });

    it("répond 400 sur un type inconnu", async () => {
      const reponse = await request(app).get("/api/produits?type=jouet");

      expect(reponse.status).toBe(400);
      expect(reponse.body.details.champs.type).toEqual(expect.any(String));
    });
  });

  describe("GET /api/produits/:id", () => {
    it("renvoie le produit", async () => {
      const { body: cree } = await creer(livre);

      await request(app).get(`/api/produits/${cree.id}`).expect(200, cree);
    });

    it("répond 404 sur un produit inconnu", async () => {
      const reponse = await request(app).get("/api/produits/inconnu");

      expect(reponse.status).toBe(404);
      expect(reponse.body.code).toBe("INTROUVABLE");
    });
  });

  describe("PUT /api/produits/:id", () => {
    function modifier(id: string, produit: object) {
      return request(app)
        .put(`/api/produits/${id}`)
        .set("Authorization", `Bearer ${tokenResponsable}`)
        .send(produit);
    }

    it("remplace le produit, ce qui permet d'archiver et de réactiver", async () => {
      const { body: cree } = await creer(livre);

      const archive = await modifier(cree.id, { ...livre, prix: 2000, archive: true });
      expect(archive.status).toBe(200);
      expect(archive.body).toEqual({ ...cree, prix: 2000, archive: true });

      const reactive = await modifier(cree.id, livre);
      expect(reactive.body.archive).toBe(false);
    });

    it("garde sa propre référence mais refuse celle d'un autre produit", async () => {
      const { body: cree } = await creer(livre);
      await creer(magazine).expect(201);

      await modifier(cree.id, { ...livre, designation: "Renommé" }).expect(200);
      const reponse = await modifier(cree.id, { ...livre, reference: "MAG-001" });

      expect(reponse.status).toBe(409);
    });

    it("répond 404 sur un produit inconnu et 400 sur un corps invalide", async () => {
      const { body: cree } = await creer(livre);

      await modifier("inconnu", livre).expect(404);
      await modifier(cree.id, {}).expect(400);
    });

    it("répond 403 pour un client", async () => {
      const { body: cree } = await creer(livre);

      await request(app)
        .put(`/api/produits/${cree.id}`)
        .set("Authorization", `Bearer ${tokenClient}`)
        .send(livre)
        .expect(403);
    });
  });

  describe("GET /api/produits/:id/historique-prix", () => {
    function historique(id: string, token = tokenResponsable) {
      return request(app).get(`/api/produits/${id}/historique-prix`).set("Authorization", `Bearer ${token}`);
    }

    it("date le prix initial puis chaque changement de prix, pas les autres modifications (RG15)", async () => {
      const { body: cree } = await creer(livre);
      const modifier = (produit: object) =>
        request(app)
          .put(`/api/produits/${cree.id}`)
          .set("Authorization", `Bearer ${tokenResponsable}`)
          .send(produit)
          .expect(200);

      horloge.date = new Date("2026-10-20T08:00:00Z");
      await modifier({ ...livre, prix: 2000 });
      horloge.date = new Date("2026-10-21T08:00:00Z");
      await modifier({ ...livre, prix: 2000, designation: "Renommé" });

      const reponse = await historique(cree.id);

      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual([
        { date: "2026-10-15T08:00:00.000Z", prix: 1800 },
        { date: "2026-10-20T08:00:00.000Z", prix: 2000 },
      ]);
    });

    it("n'expose pas l'historique dans la fiche publique", async () => {
      const { body: cree } = await creer(livre);

      expect(cree).not.toHaveProperty("historiquePrix");
    });

    it("est réservé au responsable", async () => {
      const { body: cree } = await creer(livre);

      await historique(cree.id, tokenClient).expect(403);
      await historique("inconnu").expect(404);
    });
  });

  describe("DELETE /api/produits/:id", () => {
    it("supprime le produit puis répond 404", async () => {
      const { body: cree } = await creer(livre);
      const supprimer = () =>
        request(app).delete(`/api/produits/${cree.id}`).set("Authorization", `Bearer ${tokenResponsable}`);

      await supprimer().expect(204);
      await request(app).get(`/api/produits/${cree.id}`).expect(404);
      await supprimer().expect(404);
    });

    it("répond 401 sans token", async () => {
      const { body: cree } = await creer(livre);

      await request(app).delete(`/api/produits/${cree.id}`).expect(401);
    });
  });
});
