import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loader from '../components/common/Loader.tsx'
import { useAuth } from '../contexts/useAuth'
import type { Role } from '../types/utilisateur'
import { accueilDuRole } from './redirection'

interface ProtectedRouteProps {
  role: Role
}

export default function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { utilisateur, chargement } = useAuth()
  const location = useLocation()

  if (chargement) {
    return <Loader>Vérification de la session…</Loader>
  }

  if (!utilisateur) {
    return (
      <Navigate
        to="/connexion"
        replace
        state={{ depuis: location.pathname + location.search }}
      />
    )
  }

  if (utilisateur.role !== role) {
    return <Navigate to={accueilDuRole(utilisateur.role)} replace />
  }

  return <Outlet />
}
