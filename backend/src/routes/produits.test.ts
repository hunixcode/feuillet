import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

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
    horloge = { date: new Date("2026-10-15T20:00:00Z"), maintenant: () => horloge.date };
    const utilisateurs = new MemoireUtilisateurRepository();
    const services = servicesMemoire(horloge);
    for (const libelle of ["Roman", "Presse"]) {
      await services.repositories.categories.creer({ id: libelle.toLowerCase(), libelle });
    }
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4 });
    app = createApp({
      authService,
      ...services,
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
      expect(reponse.body).toEqual({
        ...livre,
        id: expect.any(String),
        archive: false,
        prixApplique: 1800,
        disponibilite: "epuise",
      });
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

    it("refuse une catégorie hors de la liste", async () => {
      const reponse = await creer({ ...livre, categorie: "cuisine" });

      expect(reponse.status).toBe(400);
      expect(Object.keys(reponse.body.details.champs)).toEqual(["categorie"]);
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

    it("recherche sans tenir compte de la casse dans la désignation, l'auteur, l'ISSN…", async () => {
      const chercher = async (q: string) =>
        (await request(app).get("/api/produits").query({ q })).body.map((p: { reference: string }) => p.reference);

      expect(await chercher("TRÉSOR")).toEqual(["LIV-001"]);
      expect(await chercher("stevenson")).toEqual(["LIV-001"]);
      expect(await chercher("1234-5678")).toEqual(["MAG-001"]);
      expect(await chercher("liv-")).toEqual(["LIV-001"]);
      expect(await chercher("(")).toEqual([]);
    });

    it("répond 400 sur un type inconnu, une liste vide sur une catégorie sans produit", async () => {
      const parType = await request(app).get("/api/produits?type=jouet");
      const parCategorie = await request(app).get("/api/produits?categorie=inconnue");

      expect(parType.status).toBe(400);
      expect(parType.body.details.champs.type).toEqual(expect.any(String));
      expect(parCategorie.body).toEqual([]);
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
      expect(archive.body).toEqual({ ...cree, prix: 2000, prixApplique: 2000, archive: true });

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
        { date: "2026-10-15T20:00:00.000Z", prix: 1800 },
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

  describe("promotions", () => {
    let produitId: string;
    const url = () => `/api/produits/${produitId}/promotions`;
    const programmer = (promotion: object, token = tokenResponsable) =>
      request(app).post(url()).set("Authorization", `Bearer ${token}`).send(promotion);

    beforeEach(async () => {
      ({ body: { id: produitId } } = await creer(livre));
    });

    it("applique la remise du jour au prix du catalogue, arrondi à l'unité (RG11)", async () => {
      const cree = await programmer({ remise: 15, debut: "2026-10-10", fin: "2026-10-20" });
      expect(cree.status).toBe(201);
      expect(cree.body).toEqual({ id: expect.any(String), remise: 15, debut: "2026-10-10", fin: "2026-10-20" });

      const { body: liste } = await request(app).get("/api/produits");
      const { body: fiche } = await request(app).get(`/api/produits/${produitId}`);

      expect(liste[0]).toMatchObject({ prix: 1800, prixApplique: 1530, promotion: cree.body });
      expect(fiche).toMatchObject({ prixApplique: 1530, promotion: cree.body });
    });

    it("arrondit à l'unité la plus proche", async () => {
      await request(app)
        .put(`/api/produits/${produitId}`)
        .set("Authorization", `Bearer ${tokenResponsable}`)
        .send({ ...livre, prix: 999 })
        .expect(200);
      await programmer({ remise: 15, debut: "2026-10-15", fin: "2026-10-15" }).expect(201);

      const { body } = await request(app).get(`/api/produits/${produitId}`);

      expect(body.prixApplique).toBe(849);
    });

    it("compte les jours de début et de fin à l'heure de Tahiti", async () => {
      await programmer({ remise: 10, debut: "2026-10-16", fin: "2026-10-31" }).expect(201);
      const prixDuJour = async () => (await request(app).get(`/api/produits/${produitId}`)).body.prixApplique;

      horloge.date = new Date("2026-10-16T09:59:00Z");
      expect(await prixDuJour()).toBe(1800);
      horloge.date = new Date("2026-10-16T10:00:00Z");
      expect(await prixDuJour()).toBe(1620);
      horloge.date = new Date("2026-11-01T09:59:00Z");
      expect(await prixDuJour()).toBe(1620);
      horloge.date = new Date("2026-11-01T10:00:00Z");
      expect(await prixDuJour()).toBe(1800);
    });

    it("refuse deux promotions qui se chevauchent, accepte des périodes qui se suivent", async () => {
      await programmer({ remise: 10, debut: "2026-10-15", fin: "2026-10-20" }).expect(201);

      const conflit = await programmer({ remise: 20, debut: "2026-10-20", fin: "2026-10-25" });
      expect(conflit.status).toBe(409);
      expect(conflit.body.code).toBe("PROMOTION_EN_CONFLIT");

      await programmer({ remise: 20, debut: "2026-10-21", fin: "2026-10-25" }).expect(201);
    });

    it("valide la remise et les dates", async () => {
      const reponse = await programmer({ remise: 0, debut: "2026-02-30", fin: "demain" });
      const inversee = await programmer({ remise: 10, debut: "2026-10-20", fin: "2026-10-18" });
      const passee = await programmer({ remise: 10, debut: "2026-10-01", fin: "2026-10-14" });

      expect(Object.keys(reponse.body.details.champs)).toEqual(["remise", "debut", "fin"]);
      expect(Object.keys(inversee.body.details.champs)).toEqual(["fin"]);
      expect(Object.keys(passee.body.details.champs)).toEqual(["fin"]);
    });

    it("liste par date de début et supprime une promotion, qui ne s'applique plus", async () => {
      const { body: plusTard } = await programmer({ remise: 20, debut: "2026-11-01", fin: "2026-11-30" });
      const { body: maintenant } = await programmer({ remise: 10, debut: "2026-10-15", fin: "2026-10-20" });
      const lister = () => request(app).get(url()).set("Authorization", `Bearer ${tokenResponsable}`);
      const supprimer = () =>
        request(app).delete(`${url()}/${maintenant.id}`).set("Authorization", `Bearer ${tokenResponsable}`);

      expect((await lister()).body).toEqual([maintenant, plusTard]);
      await supprimer().expect(204);
      await supprimer().expect(404);
      expect((await lister()).body).toEqual([plusTard]);
      expect((await request(app).get(`/api/produits/${produitId}`)).body.prixApplique).toBe(1800);
    });

    it("garde les promotions quand la fiche est modifiée", async () => {
      await programmer({ remise: 10, debut: "2026-10-15", fin: "2026-10-20" }).expect(201);

      const { body } = await request(app)
        .put(`/api/produits/${produitId}`)
        .set("Authorization", `Bearer ${tokenResponsable}`)
        .send({ ...livre, prix: 2000 });

      expect(body).toMatchObject({ prixApplique: 1800, promotion: { remise: 10 } });
    });

    it("est réservé au responsable et répond 404 sur un produit inconnu", async () => {
      await programmer({ remise: 10, debut: "2026-10-15", fin: "2026-10-20" }, tokenClient).expect(403);
      await request(app).get(url()).expect(401);
      produitId = "inconnu";
      await programmer({ remise: 10, debut: "2026-10-15", fin: "2026-10-20" }).expect(404);
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
