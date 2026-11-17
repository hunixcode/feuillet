import cors from "cors";
import type { RequestHandler } from "express";
import helmet from "helmet";

/** Taille maximale d'un corps JSON ; au-delà, 413 CORPS_TROP_VOLUMINEUX. */
export const TAILLE_MAX_CORPS = "100kb";

const UN_AN_EN_SECONDES = 365 * 24 * 60 * 60;

/** Couvertures des livres : Open Library redirige vers archive.org, puis vers un serveur *.us.archive.org. */
export const ORIGINES_COUVERTURES = ["https://covers.openlibrary.org", "https://archive.org", "https://*.us.archive.org"];

/**
 * En-têtes de sécurité (helmet). La CSP vaut pour le front compilé servi par l'application :
 * scripts et styles du même domaine, polices Google Fonts (frontend/index.html), couvertures
 * d'Open Library, aucun cadre.
 * Le token étant gardé dans localStorage, aucun script inline ni externe n'est autorisé.
 */
export function enTetesSecurite({ production }: { production: boolean }): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", ...ORIGINES_COUVERTURES],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    xFrameOptions: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    // HTTPS seulement en production : en local, le navigateur retiendrait l'en-tête pour localhost.
    strictTransportSecurity: production ? { maxAge: UN_AN_EN_SECONDES, includeSubDomains: true } : false,
  });
}

/**
 * CORS : par défaut aucun en-tête, le front appelle /api sur la même origine.
 * Avec une liste d'origines (front servi ailleurs), seules celles-ci reçoivent Access-Control-Allow-Origin.
 */
export function corsAutorise(origines: string[]): RequestHandler {
  if (origines.length === 0) {
    return (_req, _res, next) => next();
  }
  return cors({ origin: origines });
}
