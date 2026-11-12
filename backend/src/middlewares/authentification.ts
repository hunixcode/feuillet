import type { RequestHandler } from "express";
import { ErreurApi } from "../erreurs.js";
import type { Role, UtilisateurPublic } from "../modeles/utilisateur.js";
import type { AuthService } from "../services/AuthService.js";

const PREFIXE_BEARER = /^Bearer\s+(\S+)$/i;

export function authentifier(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const jeton = PREFIXE_BEARER.exec(req.get("Authorization") ?? "")?.[1];
    if (!jeton) {
      throw new ErreurApi(401, "NON_AUTHENTIFIE", "Connectez-vous pour accéder à cette page.");
    }
    res.locals.utilisateur = await auth.verifierToken(jeton);
    next();
  };
}

// Route publique qui tient compte du compte s'il est connecté : sans token, ou avec un token invalide ou expiré,
// la requête continue en visiteur.
export function authentifierSiPresent(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const jeton = PREFIXE_BEARER.exec(req.get("Authorization") ?? "")?.[1];
    if (jeton) {
      res.locals.utilisateur = await auth.verifierToken(jeton).catch(() => undefined);
    }
    next();
  };
}

export function exigerRole(...roles: Role[]): RequestHandler {
  return (_req, res, next) => {
    const utilisateur = res.locals.utilisateur as UtilisateurPublic | undefined;
    if (!utilisateur) {
      throw new ErreurApi(401, "NON_AUTHENTIFIE", "Connectez-vous pour accéder à cette page.");
    }
    if (!roles.includes(utilisateur.role)) {
      throw new ErreurApi(403, "ACCES_REFUSE", "Vous n'avez pas accès à cet espace.");
    }
    next();
  };
}
