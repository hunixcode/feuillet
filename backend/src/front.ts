import { join } from "node:path";
import express, { Router } from "express";
import { ErreurApi } from "./erreurs.js";

const UN_AN = 365 * 24 * 60 * 60 * 1000;

// Front compilé servi par l'API en production. Les fichiers de /assets portent une empreinte dans leur nom :
// ils sont mis en cache un an, et un fichier absent répond 404 (jamais index.html à la place d'un script).
// index.html n'est jamais mis en cache, pour qu'un déploiement soit vu tout de suite. Toute autre route GET qui ne
// commence pas par /api renvoie index.html (routes de React Router) ; /api reste aux routes de l'API.
export function servirFront(dossier: string): Router {
  const router = Router();
  const index = join(dossier, "index.html");

  router.use("/assets", express.static(join(dossier, "assets"), { maxAge: UN_AN, immutable: true }));
  router.use("/assets", (req, _res, next) => {
    next(new ErreurApi(404, "INTROUVABLE", `Fichier introuvable : ${req.originalUrl.split("?")[0]}`));
  });
  router.use(express.static(dossier, { index: false }));
  router.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });

  return router;
}
