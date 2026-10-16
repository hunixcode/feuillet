import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { gererErreurs } from "../erreurs.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";
import { authentifier, exigerRole } from "./authentification.js";

describe("exigerRole", () => {
  let app: express.Express;
  let tokenClient: string;
  let tokenResponsable: string;

  beforeEach(async () => {
    const repository = new MemoireUtilisateurRepository();
    const auth = new AuthService(repository, { secretJwt: "secret", coutHash: 4 });

    ({ token: tokenClient } = await auth.inscrire({
      nom: "Client",
      email: "client@example.pf",
      motDePasse: "motdepasse123",
      typeClient: "jeunesse",
    }));
    await repository.creer({
      nom: "Responsable",
      email: "responsable@librairie.pf",
      motDePasseHash: await hasherMotDePasse("responsable123", 4),
      role: "responsable",
    });
    ({ token: tokenResponsable } = await auth.connecter({
      email: "responsable@librairie.pf",
      motDePasse: "responsable123",
    }));

    app = express();
    app.get("/responsable", authentifier(auth), exigerRole("responsable"), (_req, res) => {
      res.json({ ok: true });
    });
    app.get("/sans-authentification", exigerRole("client"), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(gererErreurs);
  });

  it("laisse passer le bon rôle", async () => {
    await request(app)
      .get("/responsable")
      .set("Authorization", `Bearer ${tokenResponsable}`)
      .expect(200, { ok: true });
  });

  it("répond 403 à un client sur l'espace responsable", async () => {
    const reponse = await request(app)
      .get("/responsable")
      .set("Authorization", `Bearer ${tokenClient}`);

    expect(reponse.status).toBe(403);
    expect(reponse.body.code).toBe("ACCES_REFUSE");
  });

  it("répond 401 si aucun utilisateur n'a été authentifié", async () => {
    const reponse = await request(app).get("/sans-authentification");

    expect(reponse.status).toBe(401);
    expect(reponse.body.code).toBe("NON_AUTHENTIFIE");
  });
});
