import type { Notification, NouvelleNotification } from "../modeles/demande.js";
import type { NotificationRepository } from "./NotificationRepository.js";

export class MemoireNotificationRepository implements NotificationRepository {
  private readonly notifications = new Map<string, Notification>();
  private prochainId = 1;

  // Ignore une notification déjà envoyée pour le même (client, produit, type), comme l'index unique MongoDB.
  ajouter(nouvelles: NouvelleNotification[]): void {
    for (const nouvelle of nouvelles) {
      const existe = [...this.notifications.values()].some(
        (n) => n.clientId === nouvelle.clientId && n.produitId === nouvelle.produitId && n.type === nouvelle.type,
      );
      if (!existe) {
        const id = String(this.prochainId++);
        this.notifications.set(id, { ...structuredClone(nouvelle), id });
      }
    }
  }

  async listerDuClient(clientId: string): Promise<Notification[]> {
    return [...this.notifications.values()]
      .filter((n) => n.clientId === clientId)
      .sort((a, b) => b.date.getTime() - a.date.getTime() || Number(b.id) - Number(a.id))
      .map((n) => structuredClone(n));
  }

  async marquerLue(id: string, clientId: string): Promise<Notification | null> {
    const notification = this.notifications.get(id);
    if (!notification || notification.clientId !== clientId) {
      return null;
    }
    notification.lue = true;
    return structuredClone(notification);
  }
}
