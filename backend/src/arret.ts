import type { Server } from "node:http";
import type { Journal } from "./journal.js";

export interface OptionsArret {
  serveur: Server;
  // Fermeture des ressources (connexion MongoDB) une fois les requêtes en cours terminées.
  fermer: () => Promise<void>;
  journal: Journal;
  // Au-delà, les connexions encore ouvertes sont coupées.
  delaiMs?: number;
}

// Arrêt propre (SIGTERM de l'hébergeur) : plus de nouvelles requêtes, celles en cours se terminent, puis la base
// est fermée. Renvoie true si tout s'est fermé dans le délai. Plusieurs appels donnent le même arrêt.
export function creerArret({ serveur, fermer, journal, delaiMs = 10_000 }: OptionsArret): () => Promise<boolean> {
  let arret: Promise<boolean> | undefined;
  return () => {
    arret ??= new Promise<boolean>((resolve) => {
      journal("Arrêt demandé : plus de nouvelles requêtes, fin de celles en cours…");
      let force = false;
      const minuteur = setTimeout(() => {
        force = true;
        journal("Délai d'arrêt dépassé : connexions restantes coupées.");
        serveur.closeAllConnections();
      }, delaiMs);
      minuteur.unref();
      serveur.close(() => {
        clearTimeout(minuteur);
        fermer()
          .then(() => {
            journal("Arrêt terminé.");
            resolve(!force);
          })
          .catch((erreur: unknown) => {
            journal(`Erreur pendant l'arrêt : ${String(erreur)}`);
            resolve(false);
          });
      });
      // Les connexions keep-alive inactives empêcheraient close() de se terminer.
      serveur.closeIdleConnections();
    });
    return arret;
  };
}
