import { Router, type Request } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { ProduitService } from "../services/ProduitService.js";

export function routesProduits(produits: ProduitService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = exigerRole("responsable");

  router.get("/", async (req, res) => {
    res.json(await produits.lister(req.query));
  });

  router.get("/:id", async (req, res) => {
    res.json(await produits.obtenir(req.params.id));
  });

  router.post("/", authentifier(auth), estResponsable, async (req, res) => {
    res.status(201).json(await produits.creer(req.body));
  });

  router.put("/:id", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await produits.modifier(req.params.id, req.body));
  });

  router.delete("/:id", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    await produits.supprimer(req.params.id);
    res.status(204).end();
  });

  return router;
}
