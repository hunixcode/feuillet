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

function lireTypeErreur(erreur: unknown): unknown {
  return typeof erreur === "object" && erreur !== null ? (erreur as { type?: unknown }).type : undefined;
}

const ERREURS_CORPS: Record<string, { statut: number; code: string; message: string }> = {
  "entity.parse.failed": {
    statut: 400,
    code: "JSON_INVALIDE",
    message: "Le corps de la requête n'est pas un JSON valide.",
  },
  "entity.too.large": {
    statut: 413,
    code: "CORPS_TROP_VOLUMINEUX",
    message: "Le corps de la requête est trop volumineux.",
  },
  "charset.unsupported": {
    statut: 415,
    code: "ENCODAGE_NON_SUPPORTE",
    message: "L'encodage du corps de la requête n'est pas supporté.",
  },
  "encoding.unsupported": {
    statut: 415,
    code: "ENCODAGE_NON_SUPPORTE",
    message: "L'encodage du corps de la requête n'est pas supporté.",
  },
};

export const gererErreurs: ErrorRequestHandler = (erreur, _req, res, _next) => {
  const requeteId = res.locals.requeteId as string | undefined;
  if (erreur instanceof ErreurApi) {
    res.status(erreur.statut).json({
      code: erreur.code,
      message: erreur.message,
      ...(erreur.details === undefined ? {} : { details: erreur.details }),
    });
    return;
  }

  const erreurCorps = ERREURS_CORPS[String(lireTypeErreur(erreur))];
  if (erreurCorps) {
    res.status(erreurCorps.statut).json({ code: erreurCorps.code, message: erreurCorps.message });
    return;
  }

  // La trace reste dans le journal du serveur ; le client ne reçoit que l'identifiant pour la retrouver.
  console.error(`Erreur ${requeteId ?? ""}`, erreur);
  res.status(500).json({
    code: "ERREUR_SERVEUR",
    message: `Une erreur interne est survenue. Réessayez plus tard.${requeteId ? ` Référence : ${requeteId}` : ""}`,
  });
};
