import type { Notification } from "../modeles/demande.js";

export interface NotificationRepository {
  // Du plus récent au plus ancien.
  listerDuClient(clientId: string): Promise<Notification[]>;
  // null si la notification n'existe pas ou n'est pas à ce client.
  marquerLue(id: string, clientId: string): Promise<Notification | null>;
}
