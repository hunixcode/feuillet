import { Router } from "express";
import { authentifier } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";

export function routesAuth(auth: AuthService): Router {
  const router = Router();

  router.post("/inscription", async (req, res) => {
    res.status(201).json(await auth.inscrire(req.body));
  });

  router.post("/connexion", async (req, res) => {
    res.json(await auth.connecter(req.body));
  });

  router.get("/moi", authentifier(auth), (_req, res) => {
    res.json({ utilisateur: res.locals.utilisateur });
  });

  return router;
}
