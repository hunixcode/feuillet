import { Router, type Request } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { ReapproService } from "../services/ReapproService.js";

type AvecId = Request<{ id: string }>;

// Fournisseurs, commandes fournisseur, réceptions et réapprovisionnement : réservés au responsable.
export function routesReappro(reappro: ReapproService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = [authentifier(auth), exigerRole("responsable")];

  router.get("/fournisseurs", ...estResponsable, async (_req, res) => {
    res.json(await reappro.listerFournisseurs());
  });

  router.post("/fournisseurs", ...estResponsable, async (req, res) => {
    res.status(201).json(await reappro.creerFournisseur(req.body));
  });

  router.put("/fournisseurs/:id", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.modifierFournisseur(req.params.id, req.body));
  });

  router.get("/commandes-fournisseur", ...estResponsable, async (req, res) => {
    res.json(await reappro.listerCommandes(req.query));
  });

  router.post("/commandes-fournisseur", ...estResponsable, async (req, res) => {
    res.status(201).json(await reappro.creerCommande(req.body));
  });

  router.get("/commandes-fournisseur/:id", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.obtenirCommande(req.params.id));
  });

  router.get("/commandes-fournisseur/:id/receptions", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.listerReceptions(req.params.id));
  });

  router.post("/commandes-fournisseur/:id/receptions", ...estResponsable, async (req: AvecId, res) => {
    res.status(201).json(await reappro.enregistrerReception(req.params.id, req.body));
  });

  router.post("/receptions/:id/validation", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.validerReception(req.params.id));
  });

  router.get("/reapprovisionnement", ...estResponsable, async (_req, res) => {
    res.json(await reappro.aRecommander());
  });

  router.get("/seuils-alerte", ...estResponsable, async (_req, res) => {
    res.json(await reappro.listerSeuils());
  });

  router.get("/produits/:id/seuil-alerte", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.obtenirSeuil(req.params.id));
  });

  router.put("/produits/:id/seuil-alerte", ...estResponsable, async (req: AvecId, res) => {
    res.json(await reappro.definirSeuil(req.params.id, req.body));
  });

  return router;
}
