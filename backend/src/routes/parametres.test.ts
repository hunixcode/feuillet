import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { PARAMETRES_DEPART } from "../modeles/parametres.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";

const reglages = {
  dureeMiseDeCoteJours: 10,
  delaiRetourJours: 15,
  delaiRetourCadeauJours: 31,
  fraisEmballage: 250,
  fraisLivraison: 1000,
  seuilAlerteDefaut: 25,
};

describe("API des paramètres", () => {
  let app: ReturnType<typeof createApp>;
  let tokenResponsable: string;
  let tokenClient: string;

  beforeEach(async () => {
    const utilisateurs = new MemoireUtilisateurRepository();
    const authService = new AuthService(utilisateurs, { secretJwt: "secret-de-test", coutHash: 4 });
    app = createApp({ authService, ...servicesMemoire(), verifierBase: async () => true });

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

  function lire(token = tokenResponsable) {
    return request(app).get("/api/parametres").set("Authorization", `Bearer ${token}`);
  }

  function modifier(corps: object, token = tokenResponsable) {
    return request(app).put("/api/parametres").set("Authorization", `Bearer ${token}`).send(corps);
  }

  it("donne les valeurs de départ tant que rien n'est réglé", async () => {
    const reponse = await lire();

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual(PARAMETRES_DEPART);
    expect(reponse.body).toMatchObject({ dureeMiseDeCoteJours: 7, delaiRetourJours: 14, delaiRetourCadeauJours: 30 });
  });

  it("enregistre les nouvelles valeurs", async () => {
    const reponse = await modifier({ ...reglages, inconnu: 3 });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual(reglages);
    expect((await lire()).body).toEqual(reglages);
  });

  it("n'accepte que des entiers strictement positifs, et un seuil d'au plus 100 %", async () => {
    const reponse = await modifier({
      ...reglages,
      dureeMiseDeCoteJours: 0,
      delaiRetourJours: 2.5,
      fraisEmballage: "300",
      seuilAlerteDefaut: 101,
      fraisLivraison: undefined,
    });

    expect(reponse.status).toBe(400);
    expect(Object.keys(reponse.body.details.champs).sort()).toEqual(
      ["delaiRetourJours", "dureeMiseDeCoteJours", "fraisEmballage", "fraisLivraison", "seuilAlerteDefaut"],
    );
    expect((await lire()).body).toEqual(PARAMETRES_DEPART);
  });

  it("est réservé au responsable", async () => {
    await request(app).get("/api/parametres").expect(401);
    await lire(tokenClient).expect(403);
    await modifier(reglages, tokenClient).expect(403);
  });
});
