import type { AuthResultat, Utilisateur } from '../types/utilisateur'
import { get, post } from './api'

export interface DonneesConnexion {
  email: string
  motDePasse: string
}

export interface DonneesInscription {
  nom: string
  email: string
  motDePasse: string
}

const CLE_TOKEN = 'token'

export function lireToken(): string | null {
  return localStorage.getItem(CLE_TOKEN)
}

export async function connexion(donnees: DonneesConnexion): Promise<Utilisateur> {
  const resultat = await post<AuthResultat>('/auth/connexion', donnees)
  localStorage.setItem(CLE_TOKEN, resultat.token)
  return resultat.utilisateur
}

export async function inscription(donnees: DonneesInscription): Promise<Utilisateur> {
  const resultat = await post<AuthResultat>('/auth/inscription', donnees)
  localStorage.setItem(CLE_TOKEN, resultat.token)
  return resultat.utilisateur
}

export async function utilisateurConnecte(): Promise<Utilisateur> {
  const resultat = await get<{ utilisateur: Utilisateur }>('/auth/moi')
  return resultat.utilisateur
}

export function deconnexion(): void {
  localStorage.removeItem(CLE_TOKEN)
}
