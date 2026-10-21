import mongoose, { Schema } from "mongoose";
import { estErreurDoublon } from "../baseDeDonnees.js";
import {
  TYPES_PRODUIT,
  type FiltresProduits,
  type NouveauProduit,
  type Produit,
} from "../modeles/produit.js";
import { ReferenceDejaUtiliseeErreur, type ProduitRepository } from "./ProduitRepository.js";

const produitSchema = new Schema<NouveauProduit>(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    designation: { type: String, required: true, trim: true },
    type: { type: String, enum: TYPES_PRODUIT, required: true },
    categorie: { type: String, required: true, trim: true },
    prix: { type: Number, required: true, min: 0 },
    tauxTva: { type: Number, required: true, min: 0, max: 100 },
    archive: { type: Boolean, required: true, default: false },
    isbn: String,
    auteur: String,
    issn: String,
    numero: Number,
    dateParution: String,
    marque: String,
    historiquePrix: [{ _id: false, date: { type: Date, required: true }, prix: { type: Number, required: true } }],
  },
  { versionKey: false },
);

export const ProduitModel = mongoose.model<NouveauProduit>("Produit", produitSchema);

type DocumentProduit = NouveauProduit & { _id: mongoose.Types.ObjectId };

function versProduit({ _id, ...produit }: DocumentProduit): Produit {
  return { id: _id.toString(), ...produit };
}

export class MongooseProduitRepository implements ProduitRepository {
  async creer(nouveau: NouveauProduit): Promise<Produit> {
    try {
      const document = await ProduitModel.create(nouveau);
      return versProduit(document.toObject());
    } catch (erreur) {
      if (estErreurDoublon(erreur)) {
        throw new ReferenceDejaUtiliseeErreur(nouveau.reference);
      }
      throw erreur;
    }
  }

  async lister({ type, categorie, archive }: FiltresProduits): Promise<Produit[]> {
    const documents = await ProduitModel.find({
      archive,
      ...(type === undefined ? {} : { type }),
      ...(categorie === undefined ? {} : { categorie }),
    })
      .sort({ designation: 1 })
      .lean<DocumentProduit[]>();
    return documents.map(versProduit);
  }

  async trouverParId(id: string): Promise<Produit | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await ProduitModel.findById(id).lean<DocumentProduit>();
    return document ? versProduit(document) : null;
  }

  async remplacer({ id, ...produit }: Produit): Promise<Produit | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    try {
      const document = await ProduitModel.findOneAndReplace({ _id: id }, produit, {
        returnDocument: "after",
        runValidators: true,
      }).lean<DocumentProduit>();
      return document ? versProduit(document) : null;
    } catch (erreur) {
      if (estErreurDoublon(erreur)) {
        throw new ReferenceDejaUtiliseeErreur(produit.reference);
      }
      throw erreur;
    }
  }

  async supprimer(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) {
      return false;
    }
    return (await ProduitModel.deleteOne({ _id: id })).deletedCount === 1;
  }
}
