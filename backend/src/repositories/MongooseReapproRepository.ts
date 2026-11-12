import mongoose, { Schema } from "mongoose";
import type { PlanMisesDeCote } from "../modeles/demande.js";
import {
  LIMITE_COMMANDES_FOURNISSEUR,
  STATUTS_COMMANDE_FOURNISSEUR,
  type ChangementCommande,
  type CommandeFournisseur,
  type FiltresCommandesFournisseur,
  type Fournisseur,
  type NouveauFournisseur,
  type NouvelleCommandeFournisseur,
  type NouvelleReception,
  type Reception,
} from "../modeles/reappro.js";
import type { ChangementStock } from "../modeles/stock.js";
import { appliquerPlanMisesDeCote } from "./MongooseDemandeRepository.js";
import {
  CommandeModifieeErreur,
  ReceptionDejaValideeErreur,
  type CommandeFournisseurRepository,
  type FournisseurRepository,
  type SeuilAlerteRepository,
} from "./ReapproRepository.js";

const fournisseurSchema = new Schema<NouveauFournisseur>(
  { nom: { type: String, required: true }, contact: String },
  { versionKey: false },
);

const commandeSchema = new Schema<NouvelleCommandeFournisseur>(
  {
    fournisseur: {
      type: new Schema({ id: String, nom: String }, { _id: false }),
      required: true,
    },
    produitId: { type: String, required: true },
    reference: { type: String, required: true },
    designation: { type: String, required: true },
    quantiteCommandee: { type: Number, required: true, min: 1 },
    quantiteRecue: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    dateArriveePrevue: { type: String, required: true },
    statut: { type: String, enum: STATUTS_COMMANDE_FOURNISSEUR, required: true },
    dateReceptionComplete: Date,
  },
  { versionKey: false },
);
commandeSchema.index({ date: -1 });
commandeSchema.index({ produitId: 1, statut: 1 });
commandeSchema.index({ produitId: 1, dateReceptionComplete: -1 });

const receptionSchema = new Schema<NouvelleReception>(
  {
    commandeId: { type: String, required: true, index: true },
    produitId: { type: String, required: true },
    date: { type: Date, required: true },
    quantiteRecue: { type: Number, required: true, min: 0 },
    quantiteAbimee: { type: Number, required: true, min: 0 },
    validee: { type: Boolean, required: true },
    dateValidation: Date,
  },
  { versionKey: false },
);

const seuilSchema = new Schema<{ _id: string; seuil: number }>(
  { _id: { type: String, required: true }, seuil: { type: Number, required: true, min: 0, max: 100 } },
  { versionKey: false },
);

export const FournisseurModel = mongoose.model<NouveauFournisseur>("Fournisseur", fournisseurSchema);
export const CommandeFournisseurModel = mongoose.model<NouvelleCommandeFournisseur>("CommandeFournisseur", commandeSchema);
export const ReceptionModel = mongoose.model<NouvelleReception>("Reception", receptionSchema);
export const SeuilAlerteModel = mongoose.model("SeuilAlerte", seuilSchema);

type AvecId<T> = T & { _id: mongoose.Types.ObjectId };

function avecId<T>({ _id, ...reste }: AvecId<T>): T & { id: string } {
  return { id: _id.toString(), ...(reste as T) };
}

export class MongooseFournisseurRepository implements FournisseurRepository {
  async creer(nouveau: NouveauFournisseur): Promise<Fournisseur> {
    const [document] = await FournisseurModel.create([nouveau]);
    return { ...nouveau, id: document!._id.toString() };
  }

  async remplacer({ id, ...fournisseur }: Fournisseur): Promise<Fournisseur | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await FournisseurModel.findOneAndReplace({ _id: id }, fournisseur, {
      returnDocument: "after",
    }).lean<AvecId<NouveauFournisseur>>();
    return document ? avecId(document) : null;
  }

  async lister(): Promise<Fournisseur[]> {
    const documents = await FournisseurModel.find().collation({ locale: "fr" }).sort({ nom: 1 }).lean<AvecId<NouveauFournisseur>[]>();
    return documents.map(avecId);
  }

  async trouverParId(id: string): Promise<Fournisseur | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await FournisseurModel.findById(id).lean<AvecId<NouveauFournisseur>>();
    return document ? avecId(document) : null;
  }
}

export class MongooseCommandeFournisseurRepository implements CommandeFournisseurRepository {
  async creer(nouvelle: NouvelleCommandeFournisseur): Promise<CommandeFournisseur> {
    const [document] = await CommandeFournisseurModel.create([nouvelle]);
    return { ...structuredClone(nouvelle), id: document!._id.toString() };
  }

  async trouverParId(id: string): Promise<CommandeFournisseur | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await CommandeFournisseurModel.findById(id).lean<AvecId<NouvelleCommandeFournisseur>>();
    return document ? avecId(document) : null;
  }

  async lister({ statut, produitId, fournisseurId }: FiltresCommandesFournisseur): Promise<CommandeFournisseur[]> {
    const documents = await CommandeFournisseurModel.find({
      ...(statut === undefined ? {} : { statut }),
      ...(produitId === undefined ? {} : { produitId }),
      ...(fournisseurId === undefined ? {} : { "fournisseur.id": fournisseurId }),
    })
      .sort({ date: -1, _id: -1 })
      .limit(LIMITE_COMMANDES_FOURNISSEUR)
      .lean<AvecId<NouvelleCommandeFournisseur>[]>();
    return documents.map(avecId);
  }

  async enCours(produitIds: string[]): Promise<CommandeFournisseur[]> {
    const documents = await CommandeFournisseurModel.find({
      produitId: { $in: produitIds },
      statut: { $ne: "recue" },
    }).lean<AvecId<NouvelleCommandeFournisseur>[]>();
    return documents.map(avecId);
  }

  async derniereRecue(produitId: string): Promise<CommandeFournisseur | null> {
    const document = await CommandeFournisseurModel.findOne({ produitId, dateReceptionComplete: { $exists: true } })
      .sort({ dateReceptionComplete: -1, _id: -1 })
      .lean<AvecId<NouvelleCommandeFournisseur>>();
    return document ? avecId(document) : null;
  }

  async aDesCommandes(produitId: string): Promise<boolean> {
    return (await CommandeFournisseurModel.exists({ produitId })) !== null;
  }

  async creerReception(nouvelle: NouvelleReception): Promise<Reception> {
    const [document] = await ReceptionModel.create([nouvelle]);
    return { ...structuredClone(nouvelle), id: document!._id.toString() };
  }

  async trouverReception(id: string): Promise<Reception | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await ReceptionModel.findById(id).lean<AvecId<NouvelleReception>>();
    return document ? avecId(document) : null;
  }

  async listerReceptions(commandeId: string): Promise<Reception[]> {
    const documents = await ReceptionModel.find({ commandeId }).sort({ date: -1, _id: -1 }).lean<AvecId<NouvelleReception>[]>();
    return documents.map(avecId);
  }

  async validerReception(
    receptionId: string,
    date: Date,
    { commandeId, quantiteRecueAvant, ...apres }: ChangementCommande,
    changement: ChangementStock,
    plan: PlanMisesDeCote,
  ): Promise<void> {
    await mongoose.connection.transaction(async (session) => {
      const reception = await ReceptionModel.updateOne(
        { _id: receptionId, validee: false },
        { $set: { validee: true, dateValidation: date } },
        { session },
      );
      if (reception.modifiedCount !== 1) {
        throw new ReceptionDejaValideeErreur(receptionId);
      }
      const commande = await CommandeFournisseurModel.updateOne(
        { _id: commandeId, quantiteRecue: quantiteRecueAvant },
        { $set: apres },
        { session },
      );
      if (commande.modifiedCount !== 1) {
        throw new CommandeModifieeErreur(commandeId);
      }
      await appliquerPlanMisesDeCote(
        { ...changement, ...(changement.mouvement && { mouvement: { ...changement.mouvement, receptionId } }) },
        plan,
        session,
      );
    });
  }
}

export class MongooseSeuilAlerteRepository implements SeuilAlerteRepository {
  async seuils(produitIds: string[]): Promise<Map<string, number>> {
    const documents = await SeuilAlerteModel.find({ _id: { $in: produitIds } }).lean();
    return new Map(documents.map((d) => [d._id, d.seuil]));
  }

  async definir(produitId: string, seuil: number | null): Promise<void> {
    if (seuil === null) {
      await SeuilAlerteModel.deleteOne({ _id: produitId });
    } else {
      await SeuilAlerteModel.updateOne({ _id: produitId }, { $set: { seuil } }, { upsert: true });
    }
  }
}
