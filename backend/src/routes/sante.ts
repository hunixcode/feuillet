import { Router } from "express";

export type VerifierBase = () => Promise<boolean>;

export function routesSante(verifierBase: VerifierBase): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const baseConnectee = await verifierBase();
    res.status(baseConnectee ? 200 : 503).json({
      status: baseConnectee ? "ok" : "degrade",
      baseDeDonnees: baseConnectee ? "connectee" : "deconnectee",
      uptimeSecondes: Math.floor(process.uptime()),
    });
  });

  return router;
}
