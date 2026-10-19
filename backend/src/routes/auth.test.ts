import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MemoireUtilisateurRepository } from "../repositories/MemoireUtilisateurRepository.js";
import { AuthService, hasherMotDePasse } from "../services/AuthService.js";

const inscriptionValide = {
  nom: "Teva Brothers",
  email: "teva@example.pf",
  motDePasse: "motdepasse123",
  typeClient: "adulte",
};

describe("API d'authentification", () => {
  let repository: MemoireUtilisateurRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new MemoireUtilisateurRepository();
    const authService = new AuthService(repository, { secretJwt: "secret-de-test", coutHash: 4 });
    app = createApp({ authService, verifierBase: async () => true });
  });

  describe("POST /api/auth/inscription", () => {
    it("répond 201 avec l'utilisateur et un token", async () => {
      const reponse = await request(app).post("/api/auth/inscription").send(inscriptionValide);

      expect(reponse.status).toBe(201);
      expect(reponse.headers["content-type"]).toMatch(/application\/json/);
      expect(reponse.body).toEqual({
        utilisateur: {
          id: expect.any(String),
          nom: "Teva Brothers",
          email: "teva@example.pf",
          role: "client",
          typeClient: "adulte",
        },
        token: expect.any(String),
      });
    });

    it("répond 400 avec le détail des champs invalides", async () => {
      const reponse = await request(app)
        .post("/api/auth/inscription")
        .send({ ...inscriptionValide, email: "invalide", motDePasse: "court" });

      expect(reponse.status).toBe(400);
      expect(reponse.body).toEqual({
        code: "VALIDATION",
        message: expect.any(String),
        details: { champs: { email: expect.any(String), motDePasse: expect.any(String) } },
      });
    });

    it("répond 409 si l'e-mail est déjà utilisé", async () => {
      await request(app).post("/api/auth/inscription").send(inscriptionValide).expect(201);

      const reponse = await request(app).post("/api/auth/inscription").send(inscriptionValide);

      expect(reponse.status).toBe(409);
      expect(reponse.body.code).toBe("EMAIL_DEJA_UTILISE");
    });

    it("répond 400 JSON_INVALIDE sur un corps mal formé", async () => {
      const reponse = await request(app)
        .post("/api/auth/inscription")
        .set("Content-Type", "application/json")
        .send('{"nom": ');

      expect(reponse.status).toBe(400);
      expect(reponse.body).toEqual({ code: "JSON_INVALIDE", message: expect.any(String) });
    });

    it("répond 413 CORPS_TROP_VOLUMINEUX sur un corps trop gros", async () => {
      const reponse = await request(app)
        .post("/api/auth/inscription")
        .send({ ...inscriptionValide, nom: "a".repeat(200_000) });

      expect(reponse.status).toBe(413);
      expect(reponse.body).toEqual({ code: "CORPS_TROP_VOLUMINEUX", message: expect.any(String) });
    });

    it("répond 400 VALIDATION sans corps", async () => {
      const reponse = await request(app).post("/api/auth/inscription");

      expect(reponse.status).toBe(400);
      expect(reponse.body.code).toBe("VALIDATION");
    });
  });

  describe("POST /api/auth/connexion", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/inscription").send(inscriptionValide).expect(201);
    });

    it("répond 200 avec l'utilisateur et un token", async () => {
      const reponse = await request(app)
        .post("/api/auth/connexion")
        .send({ email: inscriptionValide.email, motDePasse: inscriptionValide.motDePasse });

      expect(reponse.status).toBe(200);
      expect(reponse.body.utilisateur).toMatchObject({ email: "teva@example.pf", role: "client" });
      expect(reponse.body.utilisateur).not.toHaveProperty("motDePasseHash");
      expect(reponse.body.token).toEqual(expect.any(String));
    });

    it("connecte le responsable", async () => {
      await repository.creer({
        nom: "Responsable",
        email: "responsable@librairie.pf",
        motDePasseHash: await hasherMotDePasse("responsable123", 4),
        role: "responsable",
      });

      const reponse = await request(app)
        .post("/api/auth/connexion")
        .send({ email: "responsable@librairie.pf", motDePasse: "responsable123" });

      expect(reponse.status).toBe(200);
      expect(reponse.body.utilisateur.role).toBe("responsable");
    });

    it("répond 401 sur un mauvais mot de passe", async () => {
      const reponse = await request(app)
        .post("/api/auth/connexion")
        .send({ email: inscriptionValide.email, motDePasse: "mauvais-mdp" });

      expect(reponse.status).toBe(401);
      expect(reponse.body).toEqual({
        code: "IDENTIFIANTS_INVALIDES",
        message: "E-mail ou mot de passe incorrect.",
      });
    });

    it("répond 400 si un champ manque", async () => {
      const reponse = await request(app)
        .post("/api/auth/connexion")
        .send({ email: inscriptionValide.email });

      expect(reponse.status).toBe(400);
      expect(reponse.body.details).toEqual({ champs: { motDePasse: expect.any(String) } });
    });
  });

  describe("GET /api/auth/moi", () => {
    it("renvoie l'utilisateur du token", async () => {
      const inscription = await request(app).post("/api/auth/inscription").send(inscriptionValide);

      const reponse = await request(app)
        .get("/api/auth/moi")
        .set("Authorization", `Bearer ${inscription.body.token}`);

      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual({ utilisateur: inscription.body.utilisateur });
    });

    it("répond 401 sans en-tête Authorization", async () => {
      const reponse = await request(app).get("/api/auth/moi");

      expect(reponse.status).toBe(401);
      expect(reponse.body.code).toBe("NON_AUTHENTIFIE");
    });

    it.each(["Bearer", "Basic abc", "Bearer pas-un-token"])(
      "répond 401 avec l'en-tête « %s »",
      async (entete) => {
        const reponse = await request(app).get("/api/auth/moi").set("Authorization", entete);

        expect(reponse.status).toBe(401);
        expect(reponse.body.code).toBe("NON_AUTHENTIFIE");
      },
    );
  });
});
