import type { Demande, DemandePayload, NotificationClient } from '../types/demande'
import { get, post } from './api'

export function envoyerDemande(demande: DemandePayload): Promise<Demande> {
  return post<Demande>('/demandes', demande)
}

export function listerDemandes(): Promise<Demande[]> {
  return get<Demande[]>('/demandes')
}

export function annulerDemande(id: string): Promise<Demande> {
  return post<Demande>(`/demandes/${encodeURIComponent(id)}/annulation`, {})
}

export function listerNotifications(): Promise<NotificationClient[]> {
  return get<NotificationClient[]>('/notifications')
}

export function marquerNotificationLue(id: string): Promise<NotificationClient> {
  return post<NotificationClient>(`/notifications/${encodeURIComponent(id)}/lue`, {})
}
