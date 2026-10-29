import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API des catégories", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;

  beforeEach(async () => {
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4 });
    app = createApp({
      authService,
      ...servicesMemoire(),
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

  function creer(libelle: unknown, token = tokenResponsable) {
    return request(app).post("/api/categories").set("Authorization", `Bearer ${token}`).send({ libelle });
  }

  function renommer(id: string, libelle: unknown) {
    return request(app)
      .put(`/api/categories/${id}`)
      .set("Authorization", `Bearer ${tokenResponsable}`)
      .send({ libelle });
  }

  function supprimer(id: string) {
    return request(app).delete(`/api/categories/${id}`).set("Authorization", `Bearer ${tokenResponsable}`);
  }

  function creerProduit(categorie: string) {
    return request(app)
      .post("/api/produits")
      .set("Authorization", `Bearer ${tokenResponsable}`)
      .send({ reference: "LIV-001", designation: "Livre", type: "livre", categorie, prix: 1000, tauxTva: 5 });
  }

  it("crée une catégorie avec un identifiant tiré du libellé, sans accents", async () => {
    const reponse = await creer("  Bandes dessinées & mangas ");

    expect(reponse.status).toBe(201);
    expect(reponse.body).toEqual({ id: "bandes-dessinees-mangas", libelle: "Bandes dessinées & mangas" });
  });

  it("liste les catégories par libellé, sans authentification", async () => {
    await creer("Roman").expect(201);
    await creer("Jeunesse").expect(201);

    const reponse = await request(app).get("/api/categories");

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([
      { id: "jeunesse", libelle: "Jeunesse" },
      { id: "roman", libelle: "Roman" },
    ]);
  });

  it("refuse un libellé vide, sans lettre ni chiffre ou trop long", async () => {
    for (const libelle of [undefined, "   ", "!!!", "x".repeat(101)]) {
      const reponse = await creer(libelle);

      expect(reponse.status).toBe(400);
      expect(reponse.body.details.champs.libelle).toEqual(expect.any(String));
    }
  });

  it("refuse deux catégories au même nom, à la casse et aux accents près", async () => {
    await creer("Littérature").expect(201);

    const reponse = await creer("LITTERATURE");

    expect(reponse.status).toBe(409);
    expect(reponse.body.code).toBe("CATEGORIE_DEJA_EXISTANTE");
    expect(reponse.body.details.champs.libelle).toEqual(expect.any(String));
  });

  it("renomme sans changer l'identifiant : les produits restent rattachés", async () => {
    await creer("Roman").expect(201);
    const { body: produit } = await creerProduit("roman").expect(201);

    const reponse = await renommer("roman", "Romans et nouvelles");

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ id: "roman", libelle: "Romans et nouvelles" });
    const { body: liste } = await request(app).get("/api/produits?categorie=roman");
    expect(liste.map((p: { id: string }) => p.id)).toEqual([produit.id]);
  });

  it("permet de changer la casse de son propre nom, pas de prendre celui d'une autre", async () => {
    await creer("Roman").expect(201);
    await creer("Policier").expect(201);

    await renommer("roman", "ROMAN").expect(200);
    const conflit = await renommer("roman", "Policier");

    expect(conflit.status).toBe(409);
  });

  it("répond 404 en renommant ou supprimant une catégorie inconnue", async () => {
    await renommer("inconnue", "Nouveau nom").expect(404);
    await supprimer("inconnue").expect(404);
  });

  it("supprime une catégorie vide, refuse une catégorie encore utilisée", async () => {
    await creer("Roman").expect(201);
    await creer("Poésie").expect(201);
    await creerProduit("roman").expect(201);

    const utilisee = await supprimer("roman");
    expect(utilisee.status).toBe(409);
    expect(utilisee.body.code).toBe("CATEGORIE_UTILISEE");

    await supprimer("poesie").expect(204);
    const { body } = await request(app).get("/api/categories");
    expect(body).toEqual([{ id: "roman", libelle: "Roman" }]);
  });

  it("une catégorie supprimée ne peut plus être choisie pour un produit", async () => {
    await creer("Poésie").expect(201);
    await supprimer("poesie").expect(204);

    const reponse = await creerProduit("poesie");

    expect(reponse.status).toBe(400);
    expect(reponse.body.details.champs.categorie).toEqual(expect.any(String));
  });

  it("réserve les modifications au responsable", async () => {
    await request(app).post("/api/categories").send({ libelle: "Roman" }).expect(401);
    await creer("Roman", tokenClient).expect(403);
    await request(app).put("/api/categories/roman").set("Authorization", `Bearer ${tokenClient}`).expect(403);
    await request(app).delete("/api/categories/roman").set("Authorization", `Bearer ${tokenClient}`).expect(403);
  });
});
