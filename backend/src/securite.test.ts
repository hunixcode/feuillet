import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, type Dependances } from "./app.js";
import { lireOriginesCors } from "./config.js";
import { MemoireUtilisateurRepository } from "./repositories/MemoireUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { servicesMemoire } from "./tests/servicesMemoire.js";

function creerApp(options: Partial<Dependances> = {}) {
  return createApp({
    authService: new AuthService(new MemoireUtilisateurRepository(), { secretJwt: "secret-de-test", coutHash: 4 }),
    ...servicesMemoire(),
    verifierBase: async () => true,
    ...options,
  });
}

const inscription = { nom: "Teva Brothers", email: "teva@example.pf", motDePasse: "motdepasse123" };

describe("en-têtes de sécurité", () => {
  it("envoie les en-têtes de helmet sur chaque réponse, erreurs comprises", async () => {
    for (const chemin of ["/api/health", "/api/inexistante"]) {
      const reponse = await request(creerApp()).get(chemin);

      expect(reponse.headers["x-content-type-options"]).toBe("nosniff");
      expect(reponse.headers["referrer-policy"]).toBe("no-referrer");
      expect(reponse.headers["x-frame-options"]).toBe("DENY");
      expect(reponse.headers["x-powered-by"]).toBeUndefined();
    }
  });

  it("envoie une CSP stricte compatible avec le front compilé", async () => {
    const reponse = await request(creerApp()).get("/api/health");
    const csp = reponse.headers["content-security-policy"];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("style-src 'self' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(csp).toContain(
      "img-src 'self' data: https://covers.openlibrary.org https://archive.org https://*.us.archive.org;",
    );
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("n'envoie Strict-Transport-Security qu'en production", async () => {
    const enLocal = await request(creerApp()).get("/api/health");
    const enProduction = await request(creerApp({ production: true })).get("/api/health");

    expect(enLocal.headers["strict-transport-security"]).toBeUndefined();
    expect(enProduction.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  });
});

describe("CORS", () => {
  it("n'autorise aucune autre origine par défaut", async () => {
    const reponse = await request(creerApp()).get("/api/produits").set("Origin", "https://pirate.example");

    expect(reponse.status).toBe(200);
    expect(reponse.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("autorise seulement les origines listées", async () => {
    const app = creerApp({ originesCors: ["https://front.example"] });

    const autorisee = await request(app).get("/api/produits").set("Origin", "https://front.example");
    const refusee = await request(app).get("/api/produits").set("Origin", "https://pirate.example");

    expect(autorisee.headers["access-control-allow-origin"]).toBe("https://front.example");
    expect(refusee.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("répond à la requête préalable d'une origine listée, pas à celle d'une autre", async () => {
    const app = creerApp({ originesCors: ["https://front.example"] });
    const prealable = (origine: string) =>
      request(app)
        .options("/api/auth/connexion")
        .set("Origin", origine)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type,authorization");

    const autorisee = await prealable("https://front.example");
    const refusee = await prealable("https://pirate.example");

    expect(autorisee.status).toBe(204);
    expect(autorisee.headers["access-control-allow-origin"]).toBe("https://front.example");
    expect(autorisee.headers["access-control-allow-methods"]).toContain("POST");
    expect(refusee.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("taille du corps", () => {
  it("accepte un corps JSON juste sous 100 ko", async () => {
    const reponse = await request(creerApp())
      .post("/api/auth/inscription")
      .send({ ...inscription, nom: "a".repeat(95_000) });

    // Le corps est lu ; c'est la validation du nom qui le refuse.
    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe("VALIDATION");
  });

  it("refuse un corps JSON au-delà de 100 ko avec 413", async () => {
    const reponse = await request(creerApp())
      .post("/api/auth/inscription")
      .send({ ...inscription, nom: "a".repeat(105_000) });

    expect(reponse.status).toBe(413);
    expect(reponse.body).toEqual({ code: "CORPS_TROP_VOLUMINEUX", message: expect.any(String) });
  });
});

describe("erreurs inattendues", () => {
  it("ne renvoie jamais la trace ni le message de l'erreur au client", async () => {
    const app = creerApp({
      verifierBase: async () => {
        throw new Error("mot de passe Mongo : secret123");
      },
    });

    const reponse = await request(app).get("/api/health");

    expect(reponse.status).toBe(500);
    expect(reponse.body).toEqual({ code: "ERREUR_SERVEUR", message: expect.any(String) });
    expect(reponse.text).not.toContain("secret123");
    expect(reponse.text).not.toMatch(/at .*\.ts/);
  });
});

describe("lireOriginesCors", () => {
  it.each([
    [undefined, []],
    ["", []],
    ["https://front.example", ["https://front.example"]],
    [" https://a.example/ , https://b.example ,", ["https://a.example", "https://b.example"]],
  ])("lit %j comme %j", (valeur, attendu) => {
    expect(lireOriginesCors(valeur)).toEqual(attendu);
  });
});
