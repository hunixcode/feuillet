/**
 * Horloge injectable : les services métier reçoivent une Clock au lieu de
 * lire `new Date()` directement. Les tests peuvent alors simuler n'importe
 * quelle date (EQ02 : tests déterministes).
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Horloge figée pour les tests. */
export function fixedClock(iso: string): Clock {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide : "${iso}"`);
  }
  return { now: () => date };
}

/** Horloge avançable pour les tests (échéances, délais de retour…). */
export function mutableClock(startIso: string): Clock & { advance(ms: number): void } {
  let current = new Date(startIso);
  if (Number.isNaN(current.getTime())) {
    throw new Error(`Date invalide : "${startIso}"`);
  }
  return {
    now: () => new Date(current.getTime()),
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}
