import { Router, type Request, type Response } from "express";
import { authentifier, exigerRole } from "../middlewares/authentification.js";
import type { UtilisateurPublic } from "../modeles/utilisateur.js";
import type { AuthService } from "../services/AuthService.js";
import type { DemandeService } from "../services/DemandeService.js";

function utilisateur(res: Response): UtilisateurPublic {
  return res.locals.utilisateur as UtilisateurPublic;
}

// Le client crée, suit et annule ses demandes ; le responsable les voit toutes et rattache les hors catalogue.
export function routesDemandes(demandes: DemandeService, auth: AuthService): Router {
  const router = Router();
  router.use(authentifier(auth));
  const estClient = exigerRole("client");
  const estResponsable = exigerRole("responsable");

  router.post("/", estClient, async (req, res) => {
    res.status(201).json(await demandes.creer(utilisateur(res), req.body));
  });

  // Même route pour les deux espaces : le client ne reçoit que ses demandes.
  router.get("/", async (req, res) => {
    const connecte = utilisateur(res);
    res.json(connecte.role === "responsable" ? await demandes.lister(req.query) : await demandes.mesDemandes(connecte));
  });

  router.post("/:id/annulation", estClient, async (req: Request<{ id: string }>, res) => {
    res.json(await demandes.annuler(utilisateur(res), req.params.id));
  });

  router.post("/:id/rattachement", estResponsable, async (req: Request<{ id: string }>, res) => {
    res.json(await demandes.rattacher(req.params.id, req.body));
  });

  return router;
}

export function routesNotifications(demandes: DemandeService, auth: AuthService): Router {
  const router = Router();
  router.use(authentifier(auth), exigerRole("client"));

  router.get("/", async (_req, res) => {
    res.json(await demandes.mesNotifications(utilisateur(res)));
  });

  router.post("/:id/lue", async (req: Request<{ id: string }>, res) => {
    res.json(await demandes.marquerLue(utilisateur(res), req.params.id));
  });

  return router;
}
