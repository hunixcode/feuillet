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
