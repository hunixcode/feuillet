import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API du réapprovisionnement", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;
  let produitId: string;

  beforeEach(async () => {
    const horloge = { maintenant: () => new Date("2026-11-08T20:00:00Z") };
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4, horloge });
    const services = servicesMemoire(horloge);
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
    ({ token: tokenClient } = await authService.inscrire({ nom: "Marie", email: "marie@example.pf", motDePasse: "motdepasse123" }));
    ({ body: { id: produitId } } = await envoyer("post", "/api/produits", {
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
    }));
  });

  function envoyer(methode: "get" | "post" | "put", chemin: string, corps?: object, token: string | null = tokenResponsable) {
    const requete = request(app)[methode](chemin);
    if (token) {
      requete.set("Authorization", `Bearer ${token}`);
    }
    return corps ? requete.send(corps) : requete;
  }

  it("réserve toutes les routes au responsable", async () => {
    for (const [methode, chemin] of [
      ["get", "/api/fournisseurs"],
      ["get", "/api/commandes-fournisseur"],
      ["post", "/api/receptions/1/validation"],
      ["get", "/api/reapprovisionnement"],
      ["get", "/api/seuils-alerte"],
      ["put", `/api/produits/${produitId}/seuil-alerte`],
    ] as const) {
      await envoyer(methode, chemin, {}, null).expect(401);
      await envoyer(methode, chemin, {}, tokenClient).expect(403);
    }
  });

  it("gère fournisseurs, commande, réception partielle puis complète, et la date d'arrivée prévue", async () => {
    const { body: fournisseur } = await envoyer("post", "/api/fournisseurs", { nom: "Hachette Pacifique" }).expect(201);
    await envoyer("put", `/api/fournisseurs/${fournisseur.id}`, { nom: "Hachette", contact: "40 50 60 70" }).expect(200);
    expect((await envoyer("get", "/api/fournisseurs")).body).toEqual([{ id: fournisseur.id, nom: "Hachette", contact: "40 50 60 70" }]);

    const { body: commande } = await envoyer("post", "/api/commandes-fournisseur", {
      fournisseurId: fournisseur.id,
      produitId,
      quantiteCommandee: 5,
      dateArriveePrevue: "2026-11-20",
    }).expect(201);
    expect(commande).toMatchObject({ statut: "en_cours", fournisseur: { nom: "Hachette" }, date: "2026-11-08T20:00:00.000Z" });
    expect((await envoyer("get", `/api/produits/${produitId}`, undefined, null)).body).toMatchObject({
      disponibilite: "epuise",
      arriveePrevue: "2026-11-20",
    });

    const trop = await envoyer("post", `/api/commandes-fournisseur/${commande.id}/receptions`, { quantiteRecue: 6 });
    expect(trop.status).toBe(409);
    expect(trop.body).toEqual({ code: "QUANTITE_SUPERIEURE_AU_RESTANT", message: expect.any(String), details: { restant: 5 } });

    const { body: reception } = await envoyer("post", `/api/commandes-fournisseur/${commande.id}/receptions`, {
      quantiteRecue: 2,
      quantiteAbimee: 1,
    }).expect(201);
    const validation = await envoyer("post", `/api/receptions/${reception.id}/validation`);
    expect(validation.status).toBe(200);
    expect(validation.body).toMatchObject({
      reception: { validee: true, quantiteRecue: 2, quantiteAbimee: 1 },
      commande: { quantiteRecue: 2, statut: "partiellement_recue" },
    });
    const encore = await envoyer("post", `/api/receptions/${reception.id}/validation`);
    expect(encore.status).toBe(409);
    expect(encore.body.code).toBe("RECEPTION_DEJA_VALIDEE");

    const { body: reste } = await envoyer("post", `/api/commandes-fournisseur/${commande.id}/receptions`, { quantiteRecue: 3 });
    await envoyer("post", `/api/receptions/${reste.id}/validation`).expect(200);
    expect((await envoyer("get", `/api/commandes-fournisseur/${commande.id}`)).body).toMatchObject({
      quantiteRecue: 5,
      statut: "recue",
      dateReceptionComplete: "2026-11-08T20:00:00.000Z",
    });
    expect((await envoyer("get", `/api/commandes-fournisseur/${commande.id}/receptions`)).body).toHaveLength(2);
    expect((await envoyer("get", "/api/commandes-fournisseur?statut=recue")).body).toHaveLength(1);
    expect((await envoyer("get", `/api/produits/${produitId}/stock`)).body).toMatchObject({ quantitePhysique: 5 });
    expect((await envoyer("get", `/api/produits/${produitId}`, undefined, null)).body.arriveePrevue).toBeUndefined();
  });

  it("liste les produits à recommander et règle le seuil d'un produit", async () => {
    await envoyer("post", `/api/produits/${produitId}/stock/inventaire`, { quantiteComptee: 10, motif: "Stock initial" }).expect(200);
    await envoyer("post", "/api/commandes", { lignes: [{ produitId, quantite: 7 }], adresseLivraison: "Papeete", paiementDemo: "accepte" }, tokenClient).expect(201);
    expect((await envoyer("get", "/api/reapprovisionnement")).body).toEqual([]);

    const seuil = await envoyer("put", `/api/produits/${produitId}/seuil-alerte`, { seuilAlerte: 30 });

    expect(seuil.body).toEqual({ seuilAlerte: 30, parDefaut: false });
    expect((await envoyer("get", "/api/reapprovisionnement")).body).toEqual([
      expect.objectContaining({ produitId, quantiteVendable: 3, quantiteAcheteeOrigine: 10, seuilAlerte: 30, pourcentageVendu: 70 }),
    ]);
    await envoyer("put", `/api/produits/${produitId}/seuil-alerte`, { seuilAlerte: "x" }).expect(400);
  });

  it("donne le seuil d'alerte de chaque produit, réglé ou par défaut", async () => {
    expect((await envoyer("get", "/api/seuils-alerte")).body).toEqual([{ produitId, seuilAlerte: 20, parDefaut: true }]);

    await envoyer("put", `/api/produits/${produitId}/seuil-alerte`, { seuilAlerte: 35 }).expect(200);

    expect((await envoyer("get", "/api/seuils-alerte")).body).toEqual([{ produitId, seuilAlerte: 35, parDefaut: false }]);
  });

  it("répond 404 sur une commande ou une réception inconnue", async () => {
    await envoyer("get", "/api/commandes-fournisseur/inconnue").expect(404);
    await envoyer("post", "/api/commandes-fournisseur/inconnue/receptions", { quantiteRecue: 1 }).expect(404);
    await envoyer("post", "/api/receptions/inconnue/validation").expect(404);
    await envoyer("put", "/api/fournisseurs/inconnu", { nom: "X" }).expect(404);
  });
});
