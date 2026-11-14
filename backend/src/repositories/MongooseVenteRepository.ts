import mongoose, { Schema } from "mongoose";
import type { ChangementStock } from "../modeles/stock.js";
import {
  LIMITE_VENTES,
  OCCASIONS_CADEAU,
  STATUTS_VENTE,
  type FiltresVentes,
  type NouvelleVente,
  type Vente,
} from "../modeles/vente.js";
import { honorerDemandes } from "./MongooseDemandeRepository.js";
import { appliquerChangement } from "./MongooseStockRepository.js";
import type { VenteRepository } from "./VenteRepository.js";

const montant = { type: Number, required: true, min: 0 };

const venteSchema = new Schema<NouvelleVente>(
  {
    date: { type: Date, required: true },
    statut: { type: String, enum: STATUTS_VENTE, required: true },
    client: {
      type: new Schema({ id: String, nom: String, email: String }, { _id: false }),
      required: true,
    },
    lignes: [
      {
        _id: false,
        produitId: { type: String, required: true },
        reference: { type: String, required: true },
        designation: { type: String, required: true },
        quantite: { type: Number, required: true, min: 1 },
        prixUnitaire: montant,
        remise: { type: Number, required: true, min: 0, max: 100 },
        tauxTva: { type: Number, required: true, min: 0, max: 100 },
        montant,
        montantTva: montant,
      },
    ],
    occasionCadeau: { type: String, enum: OCCASIONS_CADEAU },
    emballageCadeau: { type: Boolean, required: true },
    adresseLivraison: { type: String, required: true },
    sousTotal: montant,
    fraisEmballage: montant,
    fraisLivraison: montant,
    frais: montant,
    montantTva: montant,
    total: montant,
    dateExpedition: Date,
  },
  { versionKey: false },
);
venteSchema.index({ date: -1 });
venteSchema.index({ "client.id": 1, date: -1 });

export const VenteModel = mongoose.model<NouvelleVente>("Vente", venteSchema);

type DocumentVente = NouvelleVente & { _id: mongoose.Types.ObjectId };

function versVente({ _id, ...vente }: DocumentVente): Vente {
  return { id: _id.toString(), ...vente };
}

export class MongooseVenteRepository implements VenteRepository {
  // L'identifiant est tiré avant la transaction pour être écrit dans chaque mouvement.
  async creer(nouvelle: NouvelleVente, changements: ChangementStock[], demandesHonorees: string[] = []): Promise<Vente> {
    const _id = new mongoose.Types.ObjectId();
    const venteId = _id.toString();
    await mongoose.connection.transaction(async (session) => {
      await honorerDemandes(demandesHonorees, nouvelle.date, session);
      for (const changement of changements) {
        await appliquerChangement(
          { ...changement, ...(changement.mouvement && { mouvement: { ...changement.mouvement, venteId } }) },
          session,
        );
      }
      await VenteModel.create([{ _id, ...nouvelle }], { session });
    });
    return { ...structuredClone(nouvelle), id: venteId };
  }

  async lister({ statut, clientId }: FiltresVentes): Promise<Vente[]> {
    const documents = await VenteModel.find({
      ...(statut === undefined ? {} : { statut }),
      ...(clientId === undefined ? {} : { "client.id": clientId }),
    })
      .sort({ date: -1, _id: -1 })
      .limit(LIMITE_VENTES)
      .lean<DocumentVente[]>();
    return documents.map(versVente);
  }

  async listerPeriode(debut: Date, fin: Date): Promise<Vente[]> {
    const documents = await VenteModel.find({ date: { $gte: debut, $lte: fin } }).lean<DocumentVente[]>();
    return documents.map(versVente);
  }

  async trouverParId(id: string): Promise<Vente | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await VenteModel.findById(id).lean<DocumentVente>();
    return document ? versVente(document) : null;
  }

  async marquerExpediee(id: string, date: Date): Promise<Vente | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await VenteModel.findOneAndUpdate(
      { _id: id, statut: "a_preparer" },
      { $set: { statut: "expediee", dateExpedition: date } },
      { returnDocument: "after" },
    ).lean<DocumentVente>();
    return document ? versVente(document) : null;
  }
}
