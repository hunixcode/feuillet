// Singleton du diagramme de classes (écran 13) : durées en jours, frais en XPF, seuil en %.
export interface Parametres {
  dureeMiseDeCoteJours: number;
  delaiRetourJours: number;
  delaiRetourCadeauJours: number;
  fraisEmballage: number;
  fraisLivraison: number;
  seuilAlerteDefaut: number;
}

export const CHAMPS_PARAMETRES = [
  "dureeMiseDeCoteJours",
  "delaiRetourJours",
  "delaiRetourCadeauJours",
  "fraisEmballage",
  "fraisLivraison",
  "seuilAlerteDefaut",
] as const satisfies readonly (keyof Parametres)[];

// Décision 17 (7 jours), RG09 (14 et 30 jours) ; frais et seuil : valeurs de départ de l'équipe.
export const PARAMETRES_DEPART: Parametres = {
  dureeMiseDeCoteJours: 7,
  delaiRetourJours: 14,
  delaiRetourCadeauJours: 30,
  fraisEmballage: 300,
  fraisLivraison: 800,
  seuilAlerteDefaut: 20,
};
