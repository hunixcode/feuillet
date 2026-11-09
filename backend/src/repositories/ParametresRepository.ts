import type { Parametres } from "../modeles/parametres.js";

export interface ParametresRepository {
  // Les valeurs de départ tant que rien n'a été enregistré.
  obtenir(): Promise<Parametres>;
  enregistrer(parametres: Parametres): Promise<void>;
}
