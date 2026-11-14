import mongoose, { Schema } from "mongoose";
import { CHAMPS_PARAMETRES, PARAMETRES_DEPART, type Parametres } from "../modeles/parametres.js";
import type { ParametresRepository } from "./ParametresRepository.js";

const ID_PARAMETRES = "parametres";

const entier = { type: Number, required: true, min: 1 };

const parametresSchema = new Schema<Parametres & { _id: string }>(
  {
    _id: { type: String, required: true },
    ...Object.fromEntries(CHAMPS_PARAMETRES.map((champ) => [champ, entier])),
  },
  { versionKey: false },
);

export const ParametresModel = mongoose.model("Parametres", parametresSchema);

function versParametres(document: Parametres): Parametres {
  return Object.fromEntries(CHAMPS_PARAMETRES.map((champ) => [champ, document[champ]])) as unknown as Parametres;
}

export class MongooseParametresRepository implements ParametresRepository {
  async obtenir(): Promise<Parametres> {
    const document = await ParametresModel.findById(ID_PARAMETRES).lean();
    return document ? versParametres(document) : { ...PARAMETRES_DEPART };
  }

  async enregistrer(parametres: Parametres): Promise<void> {
    await ParametresModel.replaceOne(
      { _id: ID_PARAMETRES },
      { _id: ID_PARAMETRES, ...parametres },
      { upsert: true, runValidators: true },
    );
  }

  // Seed : crée les valeurs de départ sans écraser celles réglées par le responsable.
  async initialiser(): Promise<void> {
    await ParametresModel.updateOne({ _id: ID_PARAMETRES }, { $setOnInsert: PARAMETRES_DEPART }, { upsert: true });
  }
}
