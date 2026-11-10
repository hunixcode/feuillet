import mongoose, { Schema, type ClientSession } from "mongoose";
import {
  LIMITE_DEMANDES,
  STATUTS_DEMANDE,
  TYPES_NOTIFICATION,
  type Demande,
  type FiltresDemandes,
  type NouvelleDemande,
  type NouvelleNotification,
  type PlanMisesDeCote,
} from "../modeles/demande.js";
import type { ChangementStock } from "../modeles/stock.js";
import type { DemandeRepository } from "./DemandeRepository.js";
import { appliquerChangement } from "./MongooseStockRepository.js";
import { StockModifieErreur } from "./StockRepository.js";

const demandeSchema = new Schema<NouvelleDemande>(
  {
    client: {
      type: new Schema({ id: String, nom: String, email: String }, { _id: false }),
      required: true,
    },
    produitId: String,
    titre: { type: String, required: true },
    auteur: String,
    isbn: String,
    quantiteSouhaitee: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    statut: { type: String, enum: STATUTS_DEMANDE, required: true },
    miseDeCote: {
      type: new Schema({ quantite: { type: Number, min: 1 }, dateLimite: Date }, { _id: false }),
      required: false,
    },
    dateFin: Date,
  },
  { versionKey: false },
);
demandeSchema.index({ date: -1 });
demandeSchema.index({ "client.id": 1, date: -1 });
demandeSchema.index({ produitId: 1, statut: 1, date: 1 });
demandeSchema.index({ statut: 1, "miseDeCote.dateLimite": 1 });

const notificationSchema = new Schema<NouvelleNotification>(
  {
    clientId: { type: String, required: true },
    produitId: { type: String, required: true },
    type: { type: String, enum: TYPES_NOTIFICATION, required: true },
    date: { type: Date, required: true },
    message: { type: String, required: true },
    lue: { type: Boolean, required: true },
  },
  { versionKey: false },
);
notificationSchema.index({ clientId: 1, produitId: 1, type: 1 }, { unique: true });
notificationSchema.index({ clientId: 1, date: -1 });

export const DemandeModel = mongoose.model<NouvelleDemande>("Demande", demandeSchema);
export const NotificationModel = mongoose.model<NouvelleNotification>("Notification", notificationSchema);

type DocumentDemande = NouvelleDemande & { _id: mongoose.Types.ObjectId };

function versDemande({ _id, ...demande }: DocumentDemande): Demande {
  return { id: _id.toString(), ...demande };
}

function idsValides(ids: string[]): boolean {
  return ids.every((id) => mongoose.isValidObjectId(id));
}

// À appeler dans une transaction. Une demande qui n'est plus en attente fait échouer tout le plan.
export async function appliquerPlanMisesDeCote(
  changement: ChangementStock,
  plan: PlanMisesDeCote,
  session: ClientSession,
): Promise<void> {
  await appliquerChangement(changement, session);
  for (const { demandeId, miseDeCote } of plan.misesDeCote) {
    const resultat = await DemandeModel.updateOne(
      { _id: demandeId, statut: "en_attente" },
      { $set: { statut: "mise_de_cote", miseDeCote } },
      { session },
    );
    if (resultat.modifiedCount !== 1) {
      throw new StockModifieErreur(plan.produitId);
    }
  }
  // Une notification déjà envoyée pour (client, produit, type) n'est ni dupliquée ni modifiée.
  for (const notification of plan.notifications) {
    const { clientId, produitId, type } = notification;
    await NotificationModel.updateOne(
      { clientId, produitId, type },
      { $setOnInsert: notification },
      { upsert: true, session },
    );
  }
}

// À appeler dans la transaction de la vente : toutes les demandes doivent encore être mises de côté.
export async function honorerDemandes(ids: string[], date: Date, session: ClientSession): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const resultat = await DemandeModel.updateMany(
    { _id: { $in: ids }, statut: "mise_de_cote" },
    { $set: { statut: "honoree", dateFin: date } },
    { session },
  );
  if (resultat.modifiedCount !== ids.length) {
    throw new StockModifieErreur(ids[0]!);
  }
}

export class MongooseDemandeRepository implements DemandeRepository {
  async creer(nouvelle: NouvelleDemande): Promise<Demande> {
    const [document] = await DemandeModel.create([nouvelle]);
    return { ...structuredClone(nouvelle), id: document!._id.toString() };
  }

  async trouverParId(id: string): Promise<Demande | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await DemandeModel.findById(id).lean<DocumentDemande>();
    return document ? versDemande(document) : null;
  }

  async lister({ clientId, statut, produitId }: FiltresDemandes): Promise<Demande[]> {
    const documents = await DemandeModel.find({
      ...(clientId === undefined ? {} : { "client.id": clientId }),
      ...(statut === undefined ? {} : { statut }),
      ...(produitId === undefined ? {} : { produitId }),
    })
      .sort({ date: -1, _id: -1 })
      .limit(LIMITE_DEMANDES)
      .lean<DocumentDemande[]>();
    return documents.map(versDemande);
  }

  async enAttente(produitId: string): Promise<Demande[]> {
    const documents = await DemandeModel.find({ produitId, statut: "en_attente" })
      .sort({ date: 1, _id: 1 })
      .lean<DocumentDemande[]>();
    return documents.map(versDemande);
  }

  async misesDeCoteDuClient(clientId: string, produitIds: string[]): Promise<Demande[]> {
    const documents = await DemandeModel.find({
      "client.id": clientId,
      statut: "mise_de_cote",
      produitId: { $in: produitIds },
    }).lean<DocumentDemande[]>();
    return documents.map(versDemande);
  }

  async misesDeCoteEchues(date: Date): Promise<Demande[]> {
    const documents = await DemandeModel.find({
      statut: "mise_de_cote",
      "miseDeCote.dateLimite": { $lt: date },
    }).lean<DocumentDemande[]>();
    return documents.map(versDemande);
  }

  async annuler(id: string, date: Date): Promise<Demande | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await DemandeModel.findOneAndUpdate(
      { _id: id, statut: "en_attente" },
      { $set: { statut: "annulee", dateFin: date } },
      { returnDocument: "after" },
    ).lean<DocumentDemande>();
    return document ? versDemande(document) : null;
  }

  async rattacher(id: string, produitId: string): Promise<Demande | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await DemandeModel.findOneAndUpdate(
      { _id: id, statut: "en_attente", produitId: { $exists: false } },
      { $set: { produitId } },
      { returnDocument: "after" },
    ).lean<DocumentDemande>();
    return document ? versDemande(document) : null;
  }

  async aDesDemandes(produitId: string): Promise<boolean> {
    return (await DemandeModel.exists({ produitId })) !== null;
  }

  async expirer(id: string, changement: ChangementStock, date: Date): Promise<boolean> {
    if (!idsValides([id])) {
      return false;
    }
    try {
      await mongoose.connection.transaction(async (session) => {
        await appliquerChangement(changement, session);
        const resultat = await DemandeModel.updateOne(
          { _id: id, statut: "mise_de_cote" },
          { $set: { statut: "expiree", dateFin: date } },
          { session },
        );
        if (resultat.modifiedCount !== 1) {
          throw new StockModifieErreur(changement.produitId);
        }
      });
      return true;
    } catch (erreur) {
      if (erreur instanceof StockModifieErreur) {
        return false;
      }
      throw erreur;
    }
  }

  async mettreDeCote(changement: ChangementStock, plan: PlanMisesDeCote): Promise<void> {
    if (!idsValides(plan.misesDeCote.map((m) => m.demandeId))) {
      throw new StockModifieErreur(plan.produitId);
    }
    await mongoose.connection.transaction((session) => appliquerPlanMisesDeCote(changement, plan, session));
  }
}
