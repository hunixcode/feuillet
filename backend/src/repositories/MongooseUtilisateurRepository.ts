import mongoose, { Schema } from "mongoose";
import {
  ROLES,
  TYPES_CLIENT,
  type NouvelUtilisateur,
  type Utilisateur,
} from "../modeles/utilisateur.js";
import { EmailDejaUtiliseErreur, type UtilisateurRepository } from "./UtilisateurRepository.js";

const utilisateurSchema = new Schema<NouvelUtilisateur>(
  {
    nom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasseHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    typeClient: { type: String, enum: TYPES_CLIENT },
  },
  { timestamps: true },
);

export const UtilisateurModel = mongoose.model<NouvelUtilisateur>("Utilisateur", utilisateurSchema);

type DocumentUtilisateur = NouvelUtilisateur & { _id: mongoose.Types.ObjectId };

function versUtilisateur(document: DocumentUtilisateur): Utilisateur {
  return {
    id: document._id.toString(),
    nom: document.nom,
    email: document.email,
    motDePasseHash: document.motDePasseHash,
    role: document.role,
    ...(document.typeClient ? { typeClient: document.typeClient } : {}),
  };
}

function estErreurDoublon(erreur: unknown): boolean {
  return typeof erreur === "object" && erreur !== null && (erreur as { code?: unknown }).code === 11000;
}

export class MongooseUtilisateurRepository implements UtilisateurRepository {
  async creer(nouvel: NouvelUtilisateur): Promise<Utilisateur> {
    try {
      const document = await UtilisateurModel.create(nouvel);
      return versUtilisateur(document.toObject());
    } catch (erreur) {
      if (estErreurDoublon(erreur)) {
        throw new EmailDejaUtiliseErreur(nouvel.email);
      }
      throw erreur;
    }
  }

  async trouverParEmail(email: string): Promise<Utilisateur | null> {
    const document = await UtilisateurModel.findOne({ email }).lean<DocumentUtilisateur>();
    return document ? versUtilisateur(document) : null;
  }

  async trouverParId(id: string): Promise<Utilisateur | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await UtilisateurModel.findById(id).lean<DocumentUtilisateur>();
    return document ? versUtilisateur(document) : null;
  }
}
