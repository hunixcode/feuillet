import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API des ventes", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;
  let horloge: { date: Date; maintenant: () => Date };
  let produitId: string;

  beforeEach(async () => {
    horloge = { date: new Date("2026-11-08T20:00:00Z"), maintenant: () => horloge.date };
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
    ({ token: tokenClient } = await authService.inscrire({
      nom: "Marie",
      email: "marie@example.pf",
      motDePasse: "motdepasse123",
    }));
    ({ body: { id: produitId } } = await envoyer("post", "/api/produits", {
      reference: "LIV-001",
      designation: "L'Île au trésor",
      type: "livre",
      categorie: "roman",
      prix: 1800,
      tauxTva: 5,
    }));
    await envoyer("post", `/api/produits/${produitId}/stock/inventaire`, { quantiteComptee: 3, motif: "Comptage" }).expect(200);
  });

  function envoyer(methode: "get" | "post" | "delete", chemin: string, corps?: object, token: string | null = tokenResponsable) {
    const requete = request(app)[methode](chemin);
    if (token) {
      requete.set("Authorization", `Bearer ${token}`);
    }
    return corps ? requete.send(corps) : requete;
  }

  const commande = (quantite = 1) => ({
    lignes: [{ produitId, quantite }],
    adresseLivraison: "BP 12, Papeete",
  });

  it("chiffre le panier d'un visiteur sans compte", async () => {
    const reponse = await envoyer("post", "/api/commandes/devis", { lignes: [{ produitId, quantite: 2 }] }, null);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      lignes: [{ produitId, quantite: 2, prixUnitaire: 1800, montant: 3600, montantTva: 171 }],
      lignesIndisponibles: [],
      sousTotal: 3600,
      fraisLivraison: 800,
      total: 4400,
    });
  });

  it("enregistre la commande du client et la lui montre dans ses commandes", async () => {
    const creee = await envoyer("post", "/api/commandes", commande(2), tokenClient);

    expect(creee.status).toBe(201);
    expect(creee.body).toMatchObject({
      date: "2026-11-08T20:00:00.000Z",
      statut: "a_preparer",
      client: { nom: "Marie", email: "marie@example.pf" },
      total: 4400,
    });
    const { body: mes } = await envoyer("get", "/api/commandes", undefined, tokenClient);
    expect(mes).toEqual([creee.body]);
    await envoyer("get", `/api/commandes/${creee.body.id}`, undefined, tokenClient).expect(200);
    expect((await envoyer("get", `/api/produits/${produitId}/stock`)).body.quantitePhysique).toBe(1);
    expect((await request(app).get(`/api/produits/${produitId}`)).body.disponibilite).toBe("disponible");
  });

  it("répond 409 LIGNE_INDISPONIBLE avec les lignes en cause, sans rien enregistrer", async () => {
    const reponse = await envoyer("post", "/api/commandes", commande(4), tokenClient);

    expect(reponse.status).toBe(409);
    expect(reponse.body).toEqual({
      code: "LIGNE_INDISPONIBLE",
      message: expect.any(String),
      details: { lignes: [{ produitId, quantite: 4 }] },
    });
    expect((await envoyer("get", "/api/commandes", undefined, tokenClient)).body).toEqual([]);
  });

  it("répond 400 avec le champ en cause", async () => {
    const reponse = await envoyer("post", "/api/commandes", { lignes: [{ produitId, quantite: 1 }] }, tokenClient);

    expect(reponse.status).toBe(400);
    expect(reponse.body.details.champs).toEqual({ adresseLivraison: expect.any(String) });
  });

  it("réserve la commande au client et le suivi des commandes au responsable", async () => {
    await envoyer("post", "/api/commandes", commande(), null).expect(401);
    await envoyer("post", "/api/commandes", commande(), tokenResponsable).expect(403);
    await envoyer("get", "/api/commandes", undefined, null).expect(401);
    await envoyer("get", "/api/ventes", undefined, tokenClient).expect(403);
    await envoyer("get", "/api/ventes", undefined, null).expect(401);
    await envoyer("post", "/api/ventes", commande(), tokenResponsable).expect(404);
  });

  it("liste les commandes avec le filtre statut, et passe une commande à expédiée", async () => {
    const { body: premiere } = await envoyer("post", "/api/commandes", commande(), tokenClient);
    horloge.date = new Date("2026-11-08T21:00:00Z");
    const { body: seconde } = await envoyer("post", "/api/commandes", commande(), tokenClient);

    const expediee = await envoyer("post", `/api/ventes/${premiere.id}/expedition`);
    expect(expediee.status).toBe(200);
    expect(expediee.body).toMatchObject({ statut: "expediee", dateExpedition: "2026-11-08T21:00:00.000Z" });
    expect((await envoyer("post", `/api/ventes/${premiere.id}/expedition`)).body.code).toBe("COMMANDE_DEJA_EXPEDIEE");
    expect((await envoyer("get", `/api/ventes/${premiere.id}`)).body.statut).toBe("expediee");

    const ids = async (filtres: string) => (await envoyer("get", `/api/ventes${filtres}`)).body.map((v: { id: string }) => v.id);
    expect(await ids("")).toEqual([seconde.id, premiere.id]);
    expect(await ids("?statut=a_preparer")).toEqual([seconde.id]);
    expect(await ids("?statut=expediee")).toEqual([premiere.id]);
    await envoyer("get", "/api/ventes?statut=remise").expect(400);
    await envoyer("get", "/api/ventes/inconnue").expect(404);
  });

  it("crée un mouvement vente par ligne et rend le produit vendu non supprimable (RG05)", async () => {
    const { body: vente } = await envoyer("post", "/api/commandes", commande(2), tokenClient);

    const { body: journal } = await envoyer("get", `/api/mouvements?type=vente`);
    expect(journal).toEqual([
      expect.objectContaining({ produitId, quantite: -2, operateur: "client", venteId: vente.id }),
    ]);
    const suppression = await envoyer("delete", `/api/produits/${produitId}`);
    expect(suppression.status).toBe(409);
    expect(suppression.body.code).toBe("PRODUIT_AVEC_HISTORIQUE");
  });
});
