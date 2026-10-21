import { Router, type Request } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { CategorieService } from "../services/CategorieService.js";

export function routesCategories(categories: CategorieService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = exigerRole("responsable");

  router.get("/", async (_req, res) => {
    res.json(await categories.lister());
  });

  router.post("/", authentifier(auth), estResponsable, async (req, res) => {
    res.status(201).json(await categories.creer(req.body));
  });

  router.put("/:id", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await categories.renommer(req.params.id, req.body));
  });

  router.delete("/:id", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    await categories.supprimer(req.params.id);
    res.status(204).end();
  });

  return router;
}
