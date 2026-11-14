import { Router } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { ParametresService } from "../services/ParametresService.js";

export function routesParametres(parametres: ParametresService, auth: AuthService): Router {
  const router = Router();
  router.use(authentifier(auth), exigerRole("responsable"));

  router.get("/", async (_req, res) => {
    res.json(await parametres.obtenir());
  });

  router.put("/", async (req, res) => {
    res.json(await parametres.modifier(req.body));
  });

  return router;
}
