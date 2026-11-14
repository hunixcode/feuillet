import mongoose from "mongoose";
import type { Notification, NouvelleNotification } from "../modeles/demande.js";
import { NotificationModel } from "./MongooseDemandeRepository.js";
import type { NotificationRepository } from "./NotificationRepository.js";

type DocumentNotification = NouvelleNotification & { _id: mongoose.Types.ObjectId };

function versNotification({ _id, ...notification }: DocumentNotification): Notification {
  return { id: _id.toString(), ...notification };
}

export class MongooseNotificationRepository implements NotificationRepository {
  async listerDuClient(clientId: string): Promise<Notification[]> {
    const documents = await NotificationModel.find({ clientId }).sort({ date: -1, _id: -1 }).lean<DocumentNotification[]>();
    return documents.map(versNotification);
  }

  async marquerLue(id: string, clientId: string): Promise<Notification | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const document = await NotificationModel.findOneAndUpdate(
      { _id: id, clientId },
      { $set: { lue: true } },
      { returnDocument: "after" },
    ).lean<DocumentNotification>();
    return document ? versNotification(document) : null;
  }
}
