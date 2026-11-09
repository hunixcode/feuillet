import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { lireConfianceProxy } from "./config.js";
import { LIMITES_PAR_DEFAUT, type LimitesRequetes } from "./limitesRequetes.js";
import { MemoireUtilisateurRepository } from "./repositories/MemoireUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { servicesMemoire } from "./tests/servicesMemoire.js";

const compte = { nom: "Teva Brothers", email: "teva@example.pf", motDePasse: "motdepasse123" };

function creerApp(limites: LimitesRequetes = LIMITES_PAR_DEFAUT) {
  return createApp({
    authService: new AuthService(new MemoireUtilisateurRepository(), { secretJwt: "secret-de-test", coutHash: 4 }),
    ...servicesMemoire(),
    verifierBase: async () => true,
    limites,
    // Permet de simuler plusieurs IP avec X-Forwarded-For.
    confianceProxy: true,
  });
}

function connexion(app: ReturnType<typeof createApp>, email: string, ip = "203.0.113.1", motDePasse = "mauvais-mdp") {
  return request(app).post("/api/auth/connexion").set("X-Forwarded-For", ip).send({ email, motDePasse });
}

describe("limites de requêtes", () => {
  describe("POST /api/auth/connexion", () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(async () => {
      app = creerApp();
      await request(app).post("/api/auth/inscription").send(compte).expect(201);
    });

    it("refuse la 11e tentative échouée en 15 minutes avec 429 et Retry-After", async () => {
      for (let i = 0; i < 10; i++) {
        await connexion(app, compte.email).expect(401);
      }

      const reponse = await connexion(app, compte.email);

      expect(reponse.status).toBe(429);
      expect(reponse.body).toEqual({ code: "TROP_DE_REQUETES", message: expect.any(String) });
      expect(Number(reponse.headers["retry-after"])).toBeGreaterThan(0);
      expect(Number(reponse.headers["retry-after"])).toBeLessThanOrEqual(15 * 60);
    });

    it("bloque aussi le bon mot de passe une fois la limite atteinte", async () => {
      for (let i = 0; i < 10; i++) {
        await connexion(app, compte.email).expect(401);
      }

      const reponse = await connexion(app, compte.email, "203.0.113.1", compte.motDePasse);

      expect(reponse.status).toBe(429);
    });

    it("répond de la même façon que l'e-mail existe ou non", async () => {
      for (let i = 0; i < 10; i++) {
        await connexion(app, "inconnu@example.pf").expect(401);
      }

      const reponse = await connexion(app, "inconnu@example.pf");

      expect(reponse.status).toBe(429);
      expect(reponse.body.code).toBe("TROP_DE_REQUETES");
    });

    it("laisse passer une autre IP ou un autre e-mail", async () => {
      for (let i = 0; i < 10; i++) {
        await connexion(app, compte.email).expect(401);
      }

      await connexion(app, compte.email, "198.51.100.7").expect(401);
      await connexion(app, "autre@example.pf").expect(401);
    });

    it("compte l'e-mail sans tenir compte de la casse ni des espaces", async () => {
      for (let i = 0; i < 10; i++) {
        await connexion(app, compte.email).expect(401);
      }

      await connexion(app, "  TEVA@example.pf ").expect(429);
    });

    it("ne compte pas les connexions réussies", async () => {
      for (let i = 0; i < 12; i++) {
        await connexion(app, compte.email, "203.0.113.1", compte.motDePasse).expect(200);
      }
    });
  });

  describe("POST /api/auth/inscription", () => {
    const limites = { ...LIMITES_PAR_DEFAUT, inscription: { max: 2, fenetreMs: 60_000 } };

    it("refuse un compte de plus que la limite par IP, mais pas depuis une autre IP", async () => {
      const app = creerApp(limites);
      const inscrire = (numero: number, ip = "203.0.113.1") =>
        request(app)
          .post("/api/auth/inscription")
          .set("X-Forwarded-For", ip)
          .send({ ...compte, email: `client${numero}@example.pf` });

      await inscrire(1).expect(201);
      await inscrire(2).expect(201);
      const reponse = await inscrire(3);

      expect(reponse.status).toBe(429);
      expect(reponse.body.code).toBe("TROP_DE_REQUETES");
      expect(reponse.headers["retry-after"]).toBeDefined();
      await inscrire(4, "198.51.100.7").expect(201);
    });

    it("ne compte pas les inscriptions refusées", async () => {
      const app = creerApp(limites);

      for (let i = 0; i < 3; i++) {
        await request(app).post("/api/auth/inscription").send({ ...compte, email: "invalide" }).expect(400);
      }

      await request(app).post("/api/auth/inscription").send(compte).expect(201);
    });
  });

  describe("routes publiques", () => {
    const limites = { ...LIMITES_PAR_DEFAUT, publique: { max: 2, fenetreMs: 60_000 } };

    it("limite GET /api/produits par IP", async () => {
      const app = creerApp(limites);
      const lister = (ip = "203.0.113.1") => request(app).get("/api/produits").set("X-Forwarded-For", ip);

      await lister().expect(200);
      await lister().expect(200);
      const reponse = await lister();

      expect(reponse.status).toBe(429);
      expect(reponse.body).toEqual({ code: "TROP_DE_REQUETES", message: expect.any(String) });
      await lister("198.51.100.7").expect(200);
    });

    it("partage le même compteur entre la liste et le détail d'un produit", async () => {
      const app = creerApp(limites);

      await request(app).get("/api/produits").expect(200);
      await request(app).get("/api/produits/inexistant").expect(404);
      await request(app).get("/api/produits").expect(429);
    });

    it("ne limite pas les autres routes", async () => {
      const app = creerApp(limites);

      for (let i = 0; i < 3; i++) {
        await request(app).get("/api/health").expect(200);
      }
    });
  });
});

describe("lireConfianceProxy", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["true", true],
    ["1", 1],
    [" 2 ", 2],
    ["loopback", "loopback"],
  ])("lit %j comme %j", (valeur, attendu) => {
    expect(lireConfianceProxy(valeur)).toBe(attendu);
  });
});
