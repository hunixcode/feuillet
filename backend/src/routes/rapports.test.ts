import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

describe("API des retours, des rapports et des meilleures ventes", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;
  let produitId: string;
  let venteId: string;

  beforeEach(async () => {
    const horloge = { maintenant: () => new Date("2026-11-09T20:00:00Z") };
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
    await envoyer("post", `/api/produits/${produitId}/stock/inventaire`, { quantiteComptee: 5, motif: "Comptage" }).expect(200);
    const commande = { lignes: [{ produitId, quantite: 3 }], adresseLivraison: "Papeete" };
    ({ body: { id: venteId } } = await envoyer("post", "/api/commandes", commande, tokenClient).expect(201));
    await envoyer("post", `/api/ventes/${venteId}/expedition`).expect(200);
  });

  function envoyer(methode: "get" | "post", chemin: string, corps?: object, token: string | null = tokenResponsable) {
    const requete = request(app)[methode](chemin);
    if (token) {
      requete.set("Authorization", `Bearer ${token}`);
    }
    return corps ? requete.send(corps) : requete;
  }

  it("réserve retours et rapports au responsable", async () => {
    for (const [methode, chemin] of [
      ["get", `/api/ventes/${venteId}/retours`],
      ["post", `/api/ventes/${venteId}/retours`],
      ["get", "/api/rapports"],
      ["get", "/api/rapports/export.csv"],
    ] as const) {
      await envoyer(methode, chemin, {}, null).expect(401);
      await envoyer(methode, chemin, {}, tokenClient).expect(403);
    }
  });

  it("enregistre un retour et montre ce qui reste retournable", async () => {
    const retour = await envoyer("post", `/api/ventes/${venteId}/retours`, { produitId, quantite: 1, issue: "remboursement" });

    expect(retour.status).toBe(201);
    expect(retour.body).toMatchObject({ issue: "remboursement", montantRembourse: 1800, date: "2026-11-09T20:00:00.000Z" });
    const detail = await envoyer("get", `/api/ventes/${venteId}/retours`);
    expect(detail.body).toMatchObject({
      dateLimiteRetour: "2026-11-24T09:59:59.999Z",
      retourPossible: true,
      lignes: [{ produitId, quantiteRetournee: 1, quantiteRetournable: 2 }],
    });
    const trop = await envoyer("post", `/api/ventes/${venteId}/retours`, { produitId, quantite: 3, issue: "remboursement" });
    expect(trop.status).toBe(409);
    expect(trop.body).toEqual({ code: "QUANTITE_NON_RETOURNABLE", message: expect.any(String), details: { quantiteRetournable: 2 } });
    await envoyer("get", "/api/ventes/inconnue/retours").expect(404);
  });

  it("donne le rapport en JSON et en CSV téléchargeable", async () => {
    const rapport = await envoyer("get", "/api/rapports?semaine=2026-11-09");
    const csv = await envoyer("get", "/api/rapports/export.csv?debut=2026-11-01&fin=2026-11-30");

    expect(rapport.body.totaux).toMatchObject({ ventesBrutes: 5400, quantiteVendue: 3 });
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(csv.headers["content-disposition"]).toBe("attachment; filename=rapport-2026-11-01-2026-11-30.csv");
    expect(csv.text).toContain("LIV-001;L'Île au trésor;roman;3;5400");
    await envoyer("get", "/api/rapports?debut=2026-11-01").expect(400);
  });

  it("publie les meilleures ventes sans compte", async () => {
    const reponse = await envoyer("get", "/api/meilleures-ventes", undefined, null);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([expect.objectContaining({ id: produitId, quantiteVendue: 3, disponibilite: "disponible" })]);
    await expect(envoyer("get", "/api/meilleures-ventes?categorie=autre", undefined, null)).resolves.toMatchObject({ body: [] });
  });
});
