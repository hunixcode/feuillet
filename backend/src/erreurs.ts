import type { ErrorRequestHandler, RequestHandler } from "express";

export class ErreurApi extends Error {
  constructor(
    readonly statut: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

export const routeIntrouvable: RequestHandler = (req, _res, next) => {
  next(new ErreurApi(404, "INTROUVABLE", `Route introuvable : ${req.method} ${req.path}`));
};

function estErreurDeLectureJson(erreur: unknown): boolean {
  return (
    typeof erreur === "object" &&
    erreur !== null &&
    (erreur as { type?: unknown }).type === "entity.parse.failed"
  );
}

export const gererErreurs: ErrorRequestHandler = (erreur, _req, res, _next) => {
  if (erreur instanceof ErreurApi) {
    res.status(erreur.statut).json({
      code: erreur.code,
      message: erreur.message,
      ...(erreur.details === undefined ? {} : { details: erreur.details }),
    });
    return;
  }

  if (estErreurDeLectureJson(erreur)) {
    res.status(400).json({
      code: "JSON_INVALIDE",
      message: "Le corps de la requête n'est pas un JSON valide.",
    });
    return;
  }

  console.error(erreur);
  res.status(500).json({
    code: "ERREUR_SERVEUR",
    message: "Une erreur interne est survenue. Réessayez plus tard.",
  });
};
