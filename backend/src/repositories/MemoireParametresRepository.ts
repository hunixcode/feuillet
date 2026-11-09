import { PARAMETRES_DEPART, type Parametres } from "../modeles/parametres.js";
import type { ParametresRepository } from "./ParametresRepository.js";

export class MemoireParametresRepository implements ParametresRepository {
  private parametres: Parametres = { ...PARAMETRES_DEPART };

  async obtenir(): Promise<Parametres> {
    return { ...this.parametres };
  }

  async enregistrer(parametres: Parametres): Promise<void> {
    this.parametres = { ...parametres };
  }
}
