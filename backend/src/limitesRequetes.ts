import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ErreurApi } from "./erreurs.js";

export interface Limite {
  max: number;
  fenetreMs: number;
}

export interface LimitesRequetes {
  /** Connexions échouées, par IP et par e-mail. */
  connexion: Limite;
  /** Comptes créés, par IP. */
  inscription: Limite;
  /** Routes publiques coûteuses, par IP. */
  publique: Limite;
}

const MINUTE = 60_000;

export const LIMITES_PAR_DEFAUT: LimitesRequetes = {
  connexion: { max: 10, fenetreMs: 15 * MINUTE },
  inscription: { max: 5, fenetreMs: 60 * MINUTE },
  publique: { max: 120, fenetreMs: MINUTE },
};

// Compteurs en mémoire : valables pour une seule instance du serveur.
function limiter(
  { max, fenetreMs }: Limite,
  options: { cle?: (req: Request) => string; ignorerReussites?: boolean; ignorerEchecs?: boolean } = {},
): RequestHandler {
  return rateLimit({
    windowMs: fenetreMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: options.ignorerReussites ?? false,
    skipFailedRequests: options.ignorerEchecs ?? false,
    ...(options.cle ? { keyGenerator: options.cle } : {}),
    handler: (_req, _res, next) => {
      next(new ErreurApi(429, "TROP_DE_REQUETES", "Trop de tentatives. Réessayez dans quelques minutes."));
    },
  });
}

function ip(req: Request): string {
  return ipKeyGenerator(req.ip ?? "");
}

function emailDuCorps(req: Request): string {
  const email: unknown = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function creerLimiteurs(limites: LimitesRequetes) {
  return {
    // Seuls les échecs comptent, que l'e-mail existe ou non : la réponse reste la même.
    connexion: limiter(limites.connexion, {
      cle: (req) => `${ip(req)}|${emailDuCorps(req)}`,
      ignorerReussites: true,
    }),
    // Seuls les comptes réellement créés comptent (une erreur de saisie ne bloque pas).
    inscription: limiter(limites.inscription, { ignorerEchecs: true }),
    publique: limiter(limites.publique),
  };
}
