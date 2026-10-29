import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { MemoireUtilisateurRepository } from "./repositories/MemoireUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { servicesMemoire } from "./tests/servicesMemoire.js";

function creerApp(baseConnectee = true) {
  return createApp({
    authService: new AuthService(new MemoireUtilisateurRepository(), { secretJwt: "secret" }),
    ...servicesMemoire(),
    verifierBase: async () => baseConnectee,
  });
}

describe("application", () => {
  describe("GET /api/health", () => {
    it("répond 200 quand la base de données répond", async () => {
      const reponse = await request(creerApp(true)).get("/api/health");

      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual({
        status: "ok",
        baseDeDonnees: "connectee",
        uptimeSecondes: expect.any(Number),
      });
    });

    it("répond 503 quand la base de données ne répond pas", async () => {
      const reponse = await request(creerApp(false)).get("/api/health");

      expect(reponse.status).toBe(503);
      expect(reponse.body).toMatchObject({ status: "degrade", baseDeDonnees: "deconnectee" });
    });

    it("répond 500 au format commun si la vérification plante", async () => {
      const app = createApp({
        authService: new AuthService(new MemoireUtilisateurRepository(), { secretJwt: "secret" }),
        ...servicesMemoire(),
        verifierBase: async () => {
          throw new Error("panne");
        },
      });

      const reponse = await request(app).get("/api/health");

      expect(reponse.status).toBe(500);
      expect(reponse.body.code).toBe("ERREUR_SERVEUR");
    });
  });

  it("répond 404 au format d'erreur commun sur une route inconnue", async () => {
    const reponse = await request(creerApp()).get("/api/inexistante");

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ code: "INTROUVABLE", message: expect.any(String) });
  });

  it("répond 404 sur une méthode non prévue", async () => {
    const reponse = await request(creerApp()).delete("/api/auth/connexion");

    expect(reponse.status).toBe(404);
    expect(reponse.body.code).toBe("INTROUVABLE");
  });
});
