import { Router, type Request } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { AuthService } from "../services/AuthService.js";
import type { StockService } from "../services/StockService.js";

export function routesStock(stock: StockService, auth: AuthService): Router {
  const router = Router();
  const estResponsable = exigerRole("responsable");

  router.get("/stock", authentifier(auth), estResponsable, async (req, res) => {
    res.json(await stock.lister(req.query));
  });

  router.get("/mouvements", authentifier(auth), estResponsable, async (req, res) => {
    res.json(await stock.mouvements(req.query));
  });

  router.get("/produits/:id/stock", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await stock.obtenir(req.params.id));
  });

  router.post("/produits/:id/stock/inventaire", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await stock.corrigerInventaire(req.params.id, req.body));
  });

  router.post("/produits/:id/stock/defectueux", authentifier(auth), estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await stock.declarerDefectueux(req.params.id, req.body));
  });

  router.post(
    "/produits/:id/stock/defectueux/sortie",
    authentifier(auth), estResponsable,
    async (req: Request<{ id: string }>, res) => {
      res.json(await stock.sortirDefectueux(req.params.id, req.body));
    },
  );

  return router;
}
