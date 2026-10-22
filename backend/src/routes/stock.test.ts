import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API du stock", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let produitId: string;

  beforeEach(async () => {
    horloge = { date: new Date("2026-10-22T20:00:00Z"), maintenant: () => horloge.date };
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4 });
    services = servicesMemoire(horloge);
    app = createApp({ authService, ...services, verifierBase: async () => true });

    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
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
    ({ body: { id: produitId } } = await request(app)
      .post("/api/produits")
      .set("Authorization", `Bearer ${tokenResponsable}`)
      .send({ reference: "LIV-001", designation: "L'Île au trésor", type: "livre", categorie: "roman", prix: 1800, tauxTva: 5 }));
  });

  function poster(chemin: string, corps: object, token = tokenResponsable) {
    return request(app).post(`/api/produits/${produitId}/stock${chemin}`).set("Authorization", `Bearer ${token}`).send(corps);
  }

  function lire(chemin: string) {
    return request(app).get(chemin).set("Authorization", `Bearer ${tokenResponsable}`);
  }

  it("part d'un stock vide : le produit est épuisé", async () => {
    const stock = await lire(`/api/produits/${produitId}/stock`);
    const { body: fiche } = await request(app).get(`/api/produits/${produitId}`);

    expect(stock.body).toEqual({
      produitId,
      quantitePhysique: 0,
      quantiteMiseDeCote: 0,
      quantiteDefectueuse: 0,
      quantiteVendable: 0,
    });
    expect(fiche.disponibilite).toBe("epuise");
  });

  it("corrige l'inventaire en gardant la quantité avant et après (EX02)", async () => {
    await poster("/inventaire", { quantiteComptee: 12, motif: "Réception initiale" }).expect(200);
    horloge.date = new Date("2026-10-23T20:00:00Z");
    const reponse = await poster("/inventaire", { quantiteComptee: 10, motif: "Comptage annuel" });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ quantitePhysique: 10, quantiteVendable: 10 });
    const { body: journal } = await lire(`/api/mouvements?produit=${produitId}`);
    expect(journal).toEqual([
      {
        id: expect.any(String),
        produitId,
        date: "2026-10-23T20:00:00.000Z",
        type: "ajustement",
        quantite: -2,
        motif: "Comptage annuel",
        operateur: "responsable",
        quantiteAvant: 12,
        quantiteApres: 10,
      },
      expect.objectContaining({ quantite: 12, quantiteAvant: 0, quantiteApres: 12 }),
    ]);
    expect((await request(app).get(`/api/produits/${produitId}`)).body.disponibilite).toBe("disponible");
  });

  it("déclare des articles abîmés : ils passent du stock physique au stock défectueux", async () => {
    await poster("/inventaire", { quantiteComptee: 5, motif: "Comptage" }).expect(200);

    const reponse = await poster("/defectueux", { quantite: 2, motif: "Couverture déchirée" });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ quantitePhysique: 3, quantiteDefectueuse: 2, quantiteVendable: 3 });
    const { body: journal } = await lire(`/api/mouvements?produit=${produitId}&type=ajustement`);
    expect(journal[0]).toMatchObject({ quantite: -2, motif: "Couverture déchirée", quantiteAvant: 5, quantiteApres: 3 });
  });

  it("sort du stock défectueux sans créer de mouvement", async () => {
    await poster("/inventaire", { quantiteComptee: 5, motif: "Comptage" }).expect(200);
    await poster("/defectueux", { quantite: 2, motif: "Abîmés" }).expect(200);

    const reponse = await poster("/defectueux/sortie", { quantite: 2, motif: "Détruits" });

    expect(reponse.body).toMatchObject({ quantitePhysique: 3, quantiteDefectueuse: 0 });
    expect((await lire(`/api/mouvements?produit=${produitId}`)).body).toHaveLength(2);
  });

  it("refuse de sortir plus que le stock disponible", async () => {
    await poster("/inventaire", { quantiteComptee: 2, motif: "Comptage" }).expect(200);

    const abimes = await poster("/defectueux", { quantite: 3, motif: "Abîmés" });
    const sortie = await poster("/defectueux/sortie", { quantite: 1, motif: "Détruit" });

    expect(abimes.status).toBe(409);
    expect(abimes.body.code).toBe("STOCK_INSUFFISANT");
    expect(sortie.status).toBe(409);
    expect((await lire(`/api/produits/${produitId}/stock`)).body.quantitePhysique).toBe(2);
  });

  it("ne descend jamais sous les exemplaires mis de côté (RG04)", async () => {
    await services.repositories.stocks.enregistrer(
      produitId,
      { quantitePhysique: 0, quantiteMiseDeCote: 0, quantiteDefectueuse: 0 },
      { quantitePhysique: 5, quantiteMiseDeCote: 3, quantiteDefectueuse: 0 },
    );

    const inventaire = await poster("/inventaire", { quantiteComptee: 2, motif: "Comptage" });
    const abimes = await poster("/defectueux", { quantite: 3, motif: "Abîmés" });

    expect(inventaire.status).toBe(409);
    expect(inventaire.body.details.champs.quantiteComptee).toEqual(expect.any(String));
    expect(abimes.status).toBe(409);
    expect((await lire(`/api/produits/${produitId}/stock`)).body.quantiteVendable).toBe(2);
  });

  it("valide les quantités et le motif", async () => {
    const inventaire = await poster("/inventaire", { quantiteComptee: -1 });
    const abimes = await poster("/defectueux", { quantite: 0, motif: "  " });

    expect(inventaire.status).toBe(400);
    expect(Object.keys(inventaire.body.details.champs)).toEqual(["quantiteComptee", "motif"]);
    expect(Object.keys(abimes.body.details.champs)).toEqual(["quantite", "motif"]);
  });

  it("liste le stock de chaque produit avec ses quantités", async () => {
    await poster("/inventaire", { quantiteComptee: 4, motif: "Comptage" }).expect(200);

    const { body } = await lire("/api/stock?q=trésor");

    expect(body).toEqual([
      {
        produitId,
        reference: "LIV-001",
        designation: "L'Île au trésor",
        quantitePhysique: 4,
        quantiteMiseDeCote: 0,
        quantiteDefectueuse: 0,
        quantiteVendable: 4,
      },
    ]);
  });

  it("refuse la suppression d'un produit qui a des mouvements (RG05)", async () => {
    await poster("/inventaire", { quantiteComptee: 1, motif: "Comptage" }).expect(200);

    const reponse = await request(app)
      .delete(`/api/produits/${produitId}`)
      .set("Authorization", `Bearer ${tokenResponsable}`);

    expect(reponse.status).toBe(409);
    expect(reponse.body.code).toBe("PRODUIT_AVEC_HISTORIQUE");
  });

  it("répond 404 sur un produit inconnu et 400 sur un type de mouvement inconnu", async () => {
    produitId = "inconnu";
    await lire("/api/produits/inconnu/stock").expect(404);
    await poster("/inventaire", { quantiteComptee: 1, motif: "Comptage" }).expect(404);
    await lire("/api/mouvements?type=vol").expect(400);
  });

  it("est réservé au responsable", async () => {
    await request(app).get("/api/stock").expect(401);
    await request(app).get("/api/mouvements").set("Authorization", `Bearer ${tokenClient}`).expect(403);
    await poster("/inventaire", { quantiteComptee: 1, motif: "Comptage" }, tokenClient).expect(403);
  });
});
