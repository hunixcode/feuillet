import mongoose, { Schema } from "mongoose";
import { ISSUES_RETOUR, type NouveauRetour, type Retour } from "../modeles/retour.js";
import type { ChangementStock } from "../modeles/stock.js";
import { appliquerChangement } from "./MongooseStockRepository.js";
import type { RetourRepository } from "./RetourRepository.js";

const montant = { type: Number, required: true, min: 0 };

const retourSchema = new Schema<NouveauRetour>(
  {
    venteId: { type: String, required: true, index: true },
    produitId: { type: String, required: true },
    reference: { type: String, required: true },
    designation: { type: String, required: true },
    quantite: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true, index: true },
    issue: { type: String, enum: ISSUES_RETOUR, required: true },
    revendable: { type: Boolean, required: true },
    valeur: montant,
    montantRembourse: montant,
    complementPaye: montant,
    venteEchangeId: String,
    remplacementImpossible: Boolean,
  },
  { versionKey: false },
);

export const RetourModel = mongoose.model<NouveauRetour>("Retour", retourSchema);

type DocumentRetour = NouveauRetour & { _id: mongoose.Types.ObjectId };

function versRetour({ _id, ...retour }: DocumentRetour): Retour {
  return { id: _id.toString(), ...retour };
}

export class MongooseRetourRepository implements RetourRepository {
  // L'identifiant est tiré avant la transaction pour être écrit dans le mouvement.
  async creer(nouveau: NouveauRetour, changement: ChangementStock): Promise<Retour> {
    const _id = new mongoose.Types.ObjectId();
    const retourId = _id.toString();
    await mongoose.connection.transaction(async (session) => {
      await appliquerChangement(
        { ...changement, ...(changement.mouvement && { mouvement: { ...changement.mouvement, retourId } }) },
        session,
      );
      await RetourModel.create([{ _id, ...nouveau }], { session });
    });
    return { ...structuredClone(nouveau), id: retourId };
  }

  async listerDeVente(venteId: string): Promise<Retour[]> {
    const documents = await RetourModel.find({ venteId }).sort({ date: 1, _id: 1 }).lean<DocumentRetour[]>();
    return documents.map(versRetour);
  }

  async listerPeriode(debut: Date, fin: Date): Promise<Retour[]> {
    const documents = await RetourModel.find({ date: { $gte: debut, $lte: fin } }).lean<DocumentRetour[]>();
    return documents.map(versRetour);
  }
}
