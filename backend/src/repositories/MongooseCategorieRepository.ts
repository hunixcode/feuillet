import mongoose, { Schema } from "mongoose";
import { estErreurDoublon } from "../baseDeDonnees.js";
import type { Categorie } from "../modeles/categorie.js";
import { CategorieDejaExistanteErreur, type CategorieRepository } from "./CategorieRepository.js";

const categorieSchema = new Schema<{ _id: string; libelle: string }>(
  {
    _id: { type: String, required: true },
    libelle: { type: String, required: true, trim: true },
  },
  { versionKey: false },
);

export const CategorieModel = mongoose.model("Categorie", categorieSchema);

function versCategorie({ _id, libelle }: { _id: string; libelle: string }): Categorie {
  return { id: _id, libelle };
}

export class MongooseCategorieRepository implements CategorieRepository {
  async lister(): Promise<Categorie[]> {
    const documents = await CategorieModel.find().sort({ libelle: 1 }).lean();
    return documents.map(versCategorie);
  }

  async trouverParId(id: string): Promise<Categorie | null> {
    const document = await CategorieModel.findById(id).lean();
    return document ? versCategorie(document) : null;
  }

  async creer({ id, libelle }: Categorie): Promise<Categorie> {
    try {
      return versCategorie((await CategorieModel.create({ _id: id, libelle })).toObject());
    } catch (erreur) {
      if (estErreurDoublon(erreur)) {
        throw new CategorieDejaExistanteErreur(id);
      }
      throw erreur;
    }
  }

  async renommer(id: string, libelle: string): Promise<Categorie | null> {
    const document = await CategorieModel.findByIdAndUpdate(
      id,
      { libelle },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return document ? versCategorie(document) : null;
  }

  async supprimer(id: string): Promise<boolean> {
    return (await CategorieModel.deleteOne({ _id: id })).deletedCount === 1;
  }
}
