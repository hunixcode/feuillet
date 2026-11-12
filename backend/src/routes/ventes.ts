import { Router, type Request, type Response } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import type { AuthService } from "../services/AuthService.js";
import type { VenteService } from "../services/VenteService.js";

function utilisateur(res: Response): UtilisateurPublic {
  return res.locals.utilisateur as UtilisateurPublic;
}

// Commandes en ligne du client ; le devis est public pour chiffrer le panier d'un visiteur.
export function routesCommandes(ventes: VenteService, auth: AuthService): Router {
  const router = Router();
  const estClient = [authentifier(auth), exigerRole("client")];

  router.post("/devis", async (req, res) => {
    res.json(await ventes.devisEnLigne(req.body));
  });

  router.post("/", ...estClient, async (req, res) => {
    res.status(201).json(await ventes.commanderEnLigne(utilisateur(res), req.body));
  });

  router.get("/", ...estClient, async (_req, res) => {
    res.json(await ventes.mesCommandes(utilisateur(res)));
  });

  router.get("/:id", ...estClient, async (req: Request<{ id: string }>, res) => {
    res.json(await ventes.maCommande(utilisateur(res), req.params.id));
  });

  return router;
}

// Suivi de toutes les commandes, réservé au responsable.
export function routesVentes(ventes: VenteService, auth: AuthService): Router {
  const router = Router();
  router.use(authentifier(auth), exigerRole("responsable"));

  router.get("/", async (req, res) => {
    res.json(await ventes.lister(req.query));
  });

  router.get("/:id", async (req: Request<{ id: string }>, res) => {
    res.json(await ventes.obtenir(req.params.id));
  });

  router.post("/:id/expedition", async (req: Request<{ id: string }>, res) => {
    res.json(await ventes.marquerExpediee(req.params.id));
  });

  return router;
}
