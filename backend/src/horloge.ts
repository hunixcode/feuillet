export interface Horloge {
  maintenant(): Date;
}

export const horlogeSysteme: Horloge = {
  maintenant: () => new Date(),
};
