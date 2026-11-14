import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export type Journal = (ligne: string) => void;

// Identifiant de chaque requête, renvoyé dans l'en-tête X-Request-Id et cité dans le message d'une erreur 500.
export const identifierRequete: RequestHandler = (_req, res, next) => {
  const id = randomUUID();
  res.locals.requeteId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

// Une ligne par requête : méthode, chemin (sans la chaîne de requête), statut, durée et identifiant.
// Jamais le corps, les en-têtes (donc ni token ni mot de passe) ni les paramètres de recherche.
export function journaliserRequetes(journal: Journal): RequestHandler {
  return (req, res, next) => {
    const debut = process.hrtime.bigint();
    res.on("finish", () => {
      const duree = Number(process.hrtime.bigint() - debut) / 1e6;
      journal(`${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${duree.toFixed(1)} ms ${res.locals.requeteId}`);
    });
    next();
  };
}
