import mongoose, { Schema, type ClientSession } from "mongoose";
import { estErreurDoublon } from "../baseDeDonnees.js";
import {
  LIMITE_JOURNAL,
  OPERATEURS,
  STOCK_VIDE,
  TYPES_MOUVEMENT,
  type ChangementStock,
  type FiltresMouvements,
  type Mouvement,
  type NouveauMouvement,
  type Stock,
} from "../modeles/stock.js";
import { StockModifieErreur, type StockRepository } from "./StockRepository.js";

const quantite = { type: Number, required: true, min: 0 };

const stockSchema = new Schema<Stock & { _id: string }>(
  {
    _id: { type: String, required: true },
    quantitePhysique: quantite,
    quantiteMiseDeCote: quantite,
    quantiteDefectueuse: quantite,
  },
  { versionKey: false },
);

const mouvementSchema = new Schema<NouveauMouvement>(
  {
    produitId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    type: { type: String, enum: TYPES_MOUVEMENT, required: true },
    quantite: { type: Number, required: true },
    motif: { type: String, required: true },
    operateur: { type: String, enum: OPERATEURS, required: true },
    quantiteAvant: Number,
    quantiteApres: Number,
    venteId: String,
  },
  { versionKey: false },
);
mouvementSchema.index({ date: -1 });

export const StockModel = mongoose.model("Stock", stockSchema);
export const MouvementModel = mongoose.model("Mouvement", mouvementSchema);

function versStock(document: Stock | null): Stock {
  if (!document) {
    return { ...STOCK_VIDE };
  }
  const { quantitePhysique, quantiteMiseDeCote, quantiteDefectueuse } = document;
  return { quantitePhysique, quantiteMiseDeCote, quantiteDefectueuse };
}

// À appeler dans une transaction. Le filtre sur `avant` fait échouer l'écriture si le stock a changé :
// l'upsert tente alors de recréer le même _id (doublon), et la transaction annule tout le reste.
export async function appliquerChangement(
  { produitId, avant, apres, mouvement }: ChangementStock,
  session: ClientSession,
): Promise<void> {
  try {
    await StockModel.updateOne({ _id: produitId, ...avant }, { $set: apres }, { upsert: true, session });
  } catch (erreur) {
    throw estErreurDoublon(erreur) ? new StockModifieErreur(produitId) : erreur;
  }
  if (mouvement) {
    await MouvementModel.create([mouvement], { session });
  }
}

export class MongooseStockRepository implements StockRepository {
  async trouver(produitId: string): Promise<Stock> {
    return versStock(await StockModel.findById(produitId).lean());
  }

  async trouverPlusieurs(produitIds: string[]): Promise<Map<string, Stock>> {
    const documents = await StockModel.find({ _id: { $in: produitIds } }).lean();
    const parId = new Map(documents.map((d) => [d._id, versStock(d)]));
    return new Map(produitIds.map((id) => [id, parId.get(id) ?? { ...STOCK_VIDE }]));
  }

  async enregistrer(produitId: string, avant: Stock, apres: Stock, mouvement?: NouveauMouvement): Promise<void> {
    await mongoose.connection.transaction((session) =>
      appliquerChangement({ produitId, avant, apres, ...(mouvement && { mouvement }) }, session),
    );
  }

  async listerMouvements({ produitId, type }: FiltresMouvements): Promise<Mouvement[]> {
    const documents = await MouvementModel.find({
      ...(produitId === undefined ? {} : { produitId }),
      ...(type === undefined ? {} : { type }),
    })
      .sort({ date: -1, _id: -1 })
      .limit(LIMITE_JOURNAL)
      .lean();
    return documents.map(({ _id, ...mouvement }) => ({ id: _id.toString(), ...mouvement }));
  }

  async aDesMouvements(produitId: string): Promise<boolean> {
    return (await MouvementModel.exists({ produitId })) !== null;
  }
}
