import { createContext, useContext } from 'react'
import type { DonneesConnexion, DonneesInscription } from '../services/authService'
import type { Utilisateur } from '../types/utilisateur'

export interface AuthContextValue {
  utilisateur: Utilisateur | null
  chargement: boolean
  connexion: (donnees: DonneesConnexion) => Promise<Utilisateur>
  inscription: (donnees: DonneesInscription) => Promise<Utilisateur>
  deconnexion: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const valeur = useContext(AuthContext)
  if (!valeur) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider.')
  }
  return valeur
}
