import { Router, type Request } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { RapportService } from "../services/RapportService.js";
import type { RetourService } from "../services/RetourService.js";

type AvecId = Request<{ id: string }>;

// Retours d'une vente (écran 9), réservés au responsable ; montés sous /api/ventes.
export function routesRetours(retours: RetourService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = [authentifier(auth), exigerRole("responsable")];

  router.get("/:id/retours", ...estResponsable, async (req: AvecId, res) => {
    res.json(await retours.retoursDeVente(req.params.id));
  });

  router.post("/:id/retours", ...estResponsable, async (req: AvecId, res) => {
    res.status(201).json(await retours.enregistrer(req.params.id, req.body));
  });

  return router;
}

// Rapports réservés au responsable ; meilleures ventes publiques (RG14).
export function routesRapports(rapports: RapportService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = [authentifier(auth), exigerRole("responsable")];

  router.get("/rapports", ...estResponsable, async (req, res) => {
    res.json(await rapports.rapport(req.query));
  });

  router.get("/rapports/export.csv", ...estResponsable, async (req, res) => {
    const { nomFichier, contenu } = await rapports.exporterCsv(req.query);
    res.type("text/csv; charset=utf-8").attachment(nomFichier).send(contenu);
  });

  router.get("/meilleures-ventes", async (req, res) => {
    res.json(await rapports.meilleuresVentes(req.query));
  });

  return router;
}
