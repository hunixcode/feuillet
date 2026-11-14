import { CHAMPS_PARAMETRES, type Parametres } from "../modeles/parametres.js";
import type { ParametresRepository } from "../repositories/ParametresRepository.js";
import { erreurValidation, lireObjet, type ErreursChamps } from "../validation.js";

const VALEUR_MAX = 1_000_000;
const POURCENTAGE_MAX = 100;

function validerParametres(corps: unknown): Parametres {
  const donnees = lireObjet(corps);
  const champs: ErreursChamps = {};
  for (const champ of CHAMPS_PARAMETRES) {
    const valeur = donnees[champ];
    const maximum = champ === "seuilAlerteDefaut" ? POURCENTAGE_MAX : VALEUR_MAX;
    if (!Number.isInteger(valeur) || (valeur as number) < 1 || (valeur as number) > maximum) {
      champs[champ] = `La valeur doit être un nombre entier entre 1 et ${maximum.toLocaleString("fr-FR")}.`;
    }
  }
  if (Object.keys(champs).length > 0) {
    throw erreurValidation(champs);
  }
  return Object.fromEntries(CHAMPS_PARAMETRES.map((champ) => [champ, donnees[champ]])) as unknown as Parametres;
}

export class ParametresService {
  constructor(private readonly parametres: ParametresRepository) {}

  obtenir(): Promise<Parametres> {
    return this.parametres.obtenir();
  }

  async modifier(corps: unknown): Promise<Parametres> {
    const parametres = validerParametres(corps);
    await this.parametres.enregistrer(parametres);
    return parametres;
  }
}
