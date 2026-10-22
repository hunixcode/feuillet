import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import './ResponsableLayout.css'

const liens = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/catalogue', label: 'Catalogue' },
  { to: '/admin/stock', label: 'Stock' },
  { to: '/admin/ventes', label: 'Ventes et retours' },
  { to: '/admin/demandes', label: 'Demandes' },
  { to: '/admin/commandes', label: 'Commandes' },
  { to: '/admin/rapports', label: 'Rapports' },
  { to: '/admin/parametres', label: 'Paramètres' },
]

function ResponsableLayout() {
  const { utilisateur, deconnexion } = useAuth()
  const navigate = useNavigate()

  function seDeconnecter() {
    deconnexion()
    navigate('/connexion')
  }

  return (
    <div className="admin-layout">
      <aside className="admin-cote">
        <Link to="/catalogue" className="admin-logo">
          Feuillet
        </Link>
        <p className="admin-espace">Espace responsable</p>
        <nav aria-label="Menu responsable">
          <ul className="admin-menu">
            {liens.map((lien) => (
              <li key={lien.to}>
                <NavLink to={lien.to} end={lien.end}>
                  {lien.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-compte">
          <span className="admin-compte-nom">{utilisateur?.nom}</span>
          <button type="button" className="admin-compte-bouton" onClick={seDeconnecter}>
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="admin-contenu">
        <Outlet />
      </main>
    </div>
  )
}

export default ResponsableLayout
