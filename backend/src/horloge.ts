export interface Horloge {
  maintenant(): Date;
}

export const horlogeSysteme: Horloge = {
  maintenant: () => new Date(),
};

// Les dates métier (promotions…) sont celles de la librairie, à Tahiti, au format AAAA-MM-JJ.
export function dateDuJour(horloge: Horloge): string {
  return horloge.maintenant().toLocaleDateString("en-CA", { timeZone: "Pacific/Tahiti" });
}

// Tahiti est à UTC−10 toute l'année (pas d'heure d'été).
const DECALAGE_TAHITI = "-10:00";

// Jour de Tahiti (AAAA-MM-JJ) d'un instant.
export function jourDe(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Pacific/Tahiti" });
}

// Ajoute des jours à une date AAAA-MM-JJ.
export function ajouterJours(jour: string, jours: number): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + jours);
  return date.toISOString().slice(0, 10);
}

export function debutDuJour(jour: string): Date {
  return new Date(`${jour}T00:00:00.000${DECALAGE_TAHITI}`);
}

// Dernier instant du jour à Tahiti.
export function finDuJour(jour: string): Date {
  return new Date(`${jour}T23:59:59.999${DECALAGE_TAHITI}`);
}
