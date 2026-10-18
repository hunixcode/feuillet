import { useEffect, useState, type ReactNode } from 'react'
import { ApiRequestError } from '../services/api'
import * as authService from '../services/authService'
import type { Utilisateur } from '../types/utilisateur'
import { AuthContext } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [chargement, setChargement] = useState(() => authService.lireToken() !== null)

  useEffect(() => {
    if (!authService.lireToken()) {
      return
    }

    let actif = true
    authService
      .utilisateurConnecte()
      .then((trouve) => {
        if (actif) {
          setUtilisateur(trouve)
        }
      })
      .catch((erreur: unknown) => {
        if (erreur instanceof ApiRequestError && erreur.code === 'NON_AUTHENTIFIE') {
          authService.deconnexion()
        }
      })
      .finally(() => {
        if (actif) {
          setChargement(false)
        }
      })

    return () => {
      actif = false
    }
  }, [])

  async function connexion(donnees: authService.DonneesConnexion) {
    const connecte = await authService.connexion(donnees)
    setUtilisateur(connecte)
    return connecte
  }

  async function inscription(donnees: authService.DonneesInscription) {
    const inscrit = await authService.inscription(donnees)
    setUtilisateur(inscrit)
    return inscrit
  }

  function deconnexion() {
    authService.deconnexion()
    setUtilisateur(null)
  }

  return (
    <AuthContext value={{ utilisateur, chargement, connexion, inscription, deconnexion }}>
      {children}
    </AuthContext>
  )
}
