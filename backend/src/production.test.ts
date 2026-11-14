import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, request as requeteHttp, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { creerArret } from "./arret.js";
import { ConfigurationInvalide, DOSSIER_FRONT_PAR_DEFAUT, lireConfiguration } from "./configuration.js";
import { MemoireUtilisateurRepository } from "./repositories/MemoireUtilisateurRepository.js";
import { AuthService } from "./services/AuthService.js";
import { servicesMemoire } from "./tests/servicesMemoire.js";

function creerApp(options: { dossierFront?: string; journal?: (ligne: string) => void; base?: () => Promise<boolean> } = {}) {
  return createApp({
    authService: new AuthService(new MemoireUtilisateurRepository(), { secretJwt: "secret" }),
    ...servicesMemoire(),
    verifierBase: options.base ?? (async () => true),
    ...(options.dossierFront && { dossierFront: options.dossierFront }),
    ...(options.journal && { journal: options.journal }),
  });
}

const valide = { MONGODB_URI: "mongodb://localhost:27017/librairie", JWT_SECRET: "x".repeat(32) };

describe("lireConfiguration", () => {
  it("lit la configuration de développement avec le port par défaut", () => {
    expect(lireConfiguration(valide)).toEqual({
      production: false,
      port: 3000,
      mongoUri: valide.MONGODB_URI,
      secretJwt: valide.JWT_SECRET,
    });
  });

  it("sert le front compilé en production, depuis le dossier par défaut ou DOSSIER_FRONT", () => {
    const toujours = () => true;

    expect(lireConfiguration({ ...valide, NODE_ENV: "production", PORT: "10000" }, toujours)).toMatchObject({
      production: true,
      port: 10000,
      dossierFront: DOSSIER_FRONT_PAR_DEFAUT,
    });
    expect(lireConfiguration({ ...valide, NODE_ENV: "production", DOSSIER_FRONT: "/srv/front" }, toujours).dossierFront).toBe(
      "/srv/front",
    );
    expect(DOSSIER_FRONT_PAR_DEFAUT.replaceAll("\\", "/")).toMatch(/frontend\/dist$/);
  });

  it("signale tous les problèmes d'un coup", () => {
    let erreur: unknown;
    try {
      lireConfiguration({ NODE_ENV: "production", PORT: "abc", MONGODB_URI: "localhost", JWT_SECRET: "court" }, () => false);
    } catch (e) {
      erreur = e;
    }

    expect(erreur).toBeInstanceOf(ConfigurationInvalide);
    expect((erreur as ConfigurationInvalide).problemes).toEqual([
      expect.stringContaining("PORT"),
      expect.stringContaining("mongodb://"),
      expect.stringContaining("32 caractères"),
      expect.stringContaining("npm run build"),
    ]);
    expect(() => lireConfiguration({})).toThrow(/MONGODB_URI manquante[\s\S]*JWT_SECRET manquante/);
  });
});

describe("front servi par l'API", () => {
  let dossier: string;

  beforeAll(() => {
    dossier = mkdtempSync(join(tmpdir(), "front-"));
    mkdirSync(join(dossier, "assets"));
    writeFileSync(join(dossier, "index.html"), "<!doctype html><title>Feuillet</title>");
    writeFileSync(join(dossier, "assets", "index-abc123.js"), "console.log('ok')");
    writeFileSync(join(dossier, "favicon.svg"), "<svg/>");
  });

  afterAll(() => {
    rmSync(dossier, { recursive: true, force: true });
  });

  it("renvoie index.html, sans cache, pour une route du front", async () => {
    for (const chemin of ["/", "/catalogue", "/admin/stock", "/produits/42"]) {
      const reponse = await request(creerApp({ dossierFront: dossier })).get(chemin);

      expect(reponse.status).toBe(200);
      expect(reponse.headers["content-type"]).toMatch(/text\/html/);
      expect(reponse.headers["cache-control"]).toBe("no-cache");
      expect(reponse.text).toContain("<title>Feuillet</title>");
    }
  });

  it("sert les fichiers compilés, les assets en cache long", async () => {
    const app = creerApp({ dossierFront: dossier });

    const script = await request(app).get("/assets/index-abc123.js");
    const icone = await request(app).get("/favicon.svg");

    expect(script.status).toBe(200);
    expect(script.headers["content-type"]).toMatch(/javascript/);
    expect(script.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(icone.status).toBe(200);
  });

  it("répond 404 JSON pour un asset absent ou une route /api inconnue, jamais index.html", async () => {
    const app = creerApp({ dossierFront: dossier });

    for (const chemin of ["/assets/absent.js", "/api/inexistante", "/api"]) {
      const reponse = await request(app).get(chemin);

      expect(reponse.status).toBe(404);
      expect(reponse.body).toEqual({ code: "INTROUVABLE", message: expect.any(String) });
    }
    await request(app).get("/api/health").expect(200);
  });

  it("ne sert pas le front sans dossier configuré (développement)", async () => {
    await request(creerApp()).get("/catalogue").expect(404);
  });
});

describe("journal et identifiant de requête", () => {
  it("écrit une ligne par requête sans la chaîne de requête, et renvoie X-Request-Id", async () => {
    const lignes: string[] = [];
    const reponse = await request(creerApp({ journal: (ligne) => lignes.push(ligne) }))
      .post("/api/auth/connexion?email=marie@example.pf")
      .send({ email: "marie@example.pf", motDePasse: "secret-a-ne-pas-journaliser" });

    expect(reponse.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatch(new RegExp(`^POST /api/auth/connexion 401 \\d+\\.\\d ms ${reponse.headers["x-request-id"]}$`));
    expect(lignes[0]).not.toMatch(/marie|secret/);
  });

  it("cite l'identifiant dans le message d'une erreur 500, sans la trace ni le message d'origine", async () => {
    const console = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});
    const reponse = await request(
      creerApp({
        base: async () => {
          throw new Error("mot de passe : hunter2");
        },
      }),
    ).get("/api/health");
    console.mockRestore();

    expect(reponse.status).toBe(500);
    expect(reponse.body).toEqual({
      code: "ERREUR_SERVEUR",
      message: `Une erreur interne est survenue. Réessayez plus tard. Référence : ${reponse.headers["x-request-id"]}`,
    });
    expect(reponse.text).not.toContain("hunter2");
  });
});

describe("arrêt propre", () => {
  function demarrer(app: express.Express): Promise<{ serveur: Server; port: number }> {
    return new Promise((resolve) => {
      const serveur = createServer(app).listen(0, () => resolve({ serveur, port: (serveur.address() as AddressInfo).port }));
    });
  }

  function appeler(port: number, chemin: string): Promise<number> {
    return new Promise((resolve, reject) => {
      requeteHttp({ port, path: chemin, agent: false }, (reponse) => {
        reponse.resume();
        reponse.on("end", () => resolve(reponse.statusCode ?? 0));
      })
        .on("error", reject)
        .end();
    });
  }

  it("termine la requête en cours, refuse les nouvelles, puis ferme la base", async () => {
    const app = express();
    app.get("/lente", (_req, res) => {
      setTimeout(() => res.sendStatus(200), 200);
    });
    const { serveur, port } = await demarrer(app);
    const fermer = vi.fn(async () => {});
    const arreter = creerArret({ serveur, fermer, journal: () => {} });

    const enCours = appeler(port, "/lente");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const arret = arreter();

    await expect(appeler(port, "/lente")).rejects.toThrow();
    await expect(enCours).resolves.toBe(200);
    await expect(arret).resolves.toBe(true);
    expect(fermer).toHaveBeenCalledOnce();
    await expect(arreter()).resolves.toBe(true);
    expect(fermer).toHaveBeenCalledOnce();
  });

  it("coupe les connexions restantes après le délai", async () => {
    const app = express();
    app.get("/bloquee", () => {});
    const { serveur, port } = await demarrer(app);
    const journal: string[] = [];
    const arreter = creerArret({ serveur, fermer: async () => {}, journal: (l) => journal.push(l), delaiMs: 100 });

    const bloquee = appeler(port, "/bloquee").catch(() => "coupée");
    await new Promise((resolve) => setTimeout(resolve, 50));

    await expect(arreter()).resolves.toBe(false);
    await expect(bloquee).resolves.toBe("coupée");
    expect(journal).toContain("Délai d'arrêt dépassé : connexions restantes coupées.");
  });
});
