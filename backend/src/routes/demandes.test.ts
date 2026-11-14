import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API des demandes et des notifications", () => {
  let app: ReturnType<typeof createApp>;
  let services: ReturnType<typeof servicesMemoire>;
  let tokenResponsable: string;
  let tokenMarie: string;
  let tokenTeva: string;
  let produitId: string;

  beforeEach(async () => {
    const horloge = { maintenant: () => new Date("2026-11-08T20:00:00Z") };
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4, horloge });
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
    ({ token: tokenMarie } = await authService.inscrire({ nom: "Marie", email: "marie@example.pf", motDePasse: "motdepasse123" }));
    ({ token: tokenTeva } = await authService.inscrire({ nom: "Teva", email: "teva@example.pf", motDePasse: "motdepasse123" }));
    ({ body: { id: produitId } } = await envoyer("post", "/api/produits", {
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
    }));
  });

  function envoyer(methode: "get" | "post" | "delete", chemin: string, corps?: object, token: string | null = tokenResponsable) {
    const requete = request(app)[methode](chemin);
    if (token) {
      requete.set("Authorization", `Bearer ${token}`);
    }
    return corps ? requete.send(corps) : requete;
  }

  // Exemplaires reçus et mis de côté pour les demandes en attente, comme à la réception.
  async function recevoir(quantite: number) {
    const { stocks, demandes } = services.repositories;
    const avant = await stocks.trouver(produitId);
    const plan = await services.demandeService.planifierMisesDeCote(produitId, { ...avant, quantitePhysique: quantite });
    await demandes.mettreDeCote({ produitId, avant, apres: plan.stockApres }, plan);
  }

  describe("POST /api/demandes", () => {
    it("crée la demande du client sur un produit épuisé, au format du front", async () => {
      const reponse = await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 2 }, tokenMarie);

      expect(reponse.status).toBe(201);
      expect(reponse.body).toEqual({
        id: expect.any(String),
        client: { id: expect.any(String), nom: "Marie", email: "marie@example.pf" },
        produitId,
        titre: "L'Île au trésor",
        quantiteSouhaitee: 2,
        date: "2026-11-08T20:00:00.000Z",
        statut: "en_attente",
      });
    });

    it("crée une demande hors catalogue et valide les champs", async () => {
      await envoyer("post", "/api/demandes", { titre: "Le Grand Meaulnes", isbn: "9782253005292", quantiteSouhaitee: 1 }, tokenMarie)
        .expect(201);

      const reponse = await envoyer("post", "/api/demandes", { quantiteSouhaitee: 1.5 }, tokenMarie);

      expect(reponse.status).toBe(400);
      expect(reponse.body.details.champs).toEqual({ titre: expect.any(String), quantiteSouhaitee: expect.any(String) });
    });

    it("répond 409 PRODUIT_DISPONIBLE sur un article en stock", async () => {
      await envoyer("post", `/api/produits/${produitId}/stock/inventaire`, { quantiteComptee: 1, motif: "Comptage" }).expect(200);

      const reponse = await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 1 }, tokenMarie);

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe("PRODUIT_DISPONIBLE");
    });

    it("est réservée aux clients connectés", async () => {
      await envoyer("post", "/api/demandes", { titre: "Livre", quantiteSouhaitee: 1 }, null).expect(401);
      await envoyer("post", "/api/demandes", { titre: "Livre", quantiteSouhaitee: 1 }).expect(403);
    });
  });

  describe("GET /api/demandes", () => {
    it("donne au client ses demandes, au responsable toutes, filtrables par statut", async () => {
      await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 1 }, tokenMarie).expect(201);
      await envoyer("post", "/api/demandes", { titre: "Hors catalogue", quantiteSouhaitee: 1 }, tokenTeva).expect(201);
      await recevoir(1);

      const deMarie = await envoyer("get", "/api/demandes", undefined, tokenMarie);
      const toutes = await envoyer("get", "/api/demandes");
      const misesDeCote = await envoyer("get", "/api/demandes?statut=mise_de_cote");

      expect(deMarie.body).toEqual([
        expect.objectContaining({
          statut: "mise_de_cote",
          miseDeCote: { quantite: 1, dateLimite: "2026-11-16T09:59:59.999Z" },
        }),
      ]);
      expect(toutes.body).toHaveLength(2);
      expect(misesDeCote.body.map((d: { titre: string }) => d.titre)).toEqual(["L'Île au trésor"]);
      await envoyer("get", "/api/demandes?statut=perdue").expect(400);
      await envoyer("get", "/api/demandes", undefined, null).expect(401);
    });
  });

  describe("POST /api/demandes/:id/annulation", () => {
    it("annule une demande en attente du client, une seule fois", async () => {
      const { body: demande } = await envoyer("post", "/api/demandes", { titre: "Livre", quantiteSouhaitee: 1 }, tokenMarie);

      await envoyer("post", `/api/demandes/${demande.id}/annulation`, undefined, tokenTeva).expect(404);
      const reponse = await envoyer("post", `/api/demandes/${demande.id}/annulation`, undefined, tokenMarie);
      const encore = await envoyer("post", `/api/demandes/${demande.id}/annulation`, undefined, tokenMarie);

      expect(reponse.status).toBe(200);
      expect(reponse.body).toMatchObject({ statut: "annulee", dateFin: "2026-11-08T20:00:00.000Z" });
      expect(encore.status).toBe(409);
      expect(encore.body.code).toBe("DEMANDE_NON_ANNULABLE");
    });
  });

  describe("POST /api/demandes/:id/rattachement", () => {
    it("rattache une demande hors catalogue au produit, pour le responsable seulement", async () => {
      const { body: demande } = await envoyer(
        "post",
        "/api/demandes",
        { titre: "L'Île au trésor", quantiteSouhaitee: 1 },
        tokenMarie,
      );

      await envoyer("post", `/api/demandes/${demande.id}/rattachement`, { produitId }, tokenMarie).expect(403);
      const reponse = await envoyer("post", `/api/demandes/${demande.id}/rattachement`, { produitId });

      expect(reponse.status).toBe(200);
      expect(reponse.body.produitId).toBe(produitId);
      const encore = await envoyer("post", `/api/demandes/${demande.id}/rattachement`, { produitId });
      expect(encore.body.code).toBe("DEMANDE_NON_RATTACHABLE");
    });
  });

  describe("notifications", () => {
    it("liste les notifications du client et les marque comme lues", async () => {
      await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 1 }, tokenMarie).expect(201);
      await recevoir(1);

      const { body: notifications } = await envoyer("get", "/api/notifications", undefined, tokenMarie);
      expect(notifications).toEqual([
        {
          id: expect.any(String),
          clientId: expect.any(String),
          produitId,
          type: "reapprovisionnement",
          date: "2026-11-08T20:00:00.000Z",
          message: expect.stringContaining("L'Île au trésor"),
          lue: false,
        },
      ]);
      await envoyer("post", `/api/notifications/${notifications[0].id}/lue`, undefined, tokenTeva).expect(404);
      const lue = await envoyer("post", `/api/notifications/${notifications[0].id}/lue`, undefined, tokenMarie);
      expect(lue.body.lue).toBe(true);
      await expect(envoyer("get", "/api/notifications", undefined, tokenTeva)).resolves.toMatchObject({ body: [] });
      await envoyer("get", "/api/notifications").expect(403);
    });
  });

  describe("avec les ventes", () => {
    it("compte la mise de côté dans le devis du client connecté, pas dans celui d'un visiteur", async () => {
      await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 1 }, tokenMarie).expect(201);
      await recevoir(1);
      const panier = { lignes: [{ produitId, quantite: 1 }] };

      const visiteur = await envoyer("post", "/api/commandes/devis", panier, null);
      const tokenInvalide = await envoyer("post", "/api/commandes/devis", panier, "jeton-invalide");
      const titulaire = await envoyer("post", "/api/commandes/devis", panier, tokenMarie);

      expect(visiteur.body.lignesIndisponibles).toHaveLength(1);
      expect(tokenInvalide.status).toBe(200);
      expect(tokenInvalide.body.lignesIndisponibles).toHaveLength(1);
      expect(titulaire.body.lignesIndisponibles).toEqual([]);
      await envoyer("post", "/api/commandes", { ...panier, adresseLivraison: "Papeete" }, tokenMarie).expect(201);
      const [demande] = (await envoyer("get", "/api/demandes", undefined, tokenMarie)).body;
      expect(demande.statut).toBe("honoree");
    });

    it("rend un produit demandé non supprimable (RG05)", async () => {
      await envoyer("post", "/api/demandes", { produitId, quantiteSouhaitee: 1 }, tokenMarie).expect(201);

      const reponse = await envoyer("delete", `/api/produits/${produitId}`);

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe("PRODUIT_AVEC_HISTORIQUE");
    });
  });
});
