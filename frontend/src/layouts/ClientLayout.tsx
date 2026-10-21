import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

const liens = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/demandes', label: 'Mes demandes' },
  { to: '/panier', label: 'Panier' },
]

function MenuCompte() {
  const { utilisateur, chargement, deconnexion } = useAuth()
  const navigate = useNavigate()

  if (chargement) {
    return null
  }

  if (!utilisateur) {
    return (
      <li>
        <NavLink to="/connexion">Connexion</NavLink>
      </li>
    )
  }

  function seDeconnecter() {
    deconnexion()
    navigate('/catalogue')
  }

  return (
    <>
      {utilisateur.role === 'responsable' && (
        <li>
          <NavLink to="/admin">Espace responsable</NavLink>
        </li>
      )}
      <li>
        <span className="client-menu-nom">{utilisateur.nom}</span>
      </li>
      <li>
        <button type="button" className="client-menu-bouton" onClick={seDeconnecter}>
          Déconnexion
        </button>
      </li>
    </>
  )
}

function ClientLayout() {
  return (
    <div className="client-layout">
      <header className="client-entete">
        <Link to="/catalogue" className="client-logo">
          Feuillet
        </Link>
        <nav aria-label="Menu principal">
          <ul className="client-menu">
            {liens.map((lien) => (
              <li key={lien.to}>
                <NavLink to={lien.to}>{lien.label}</NavLink>
              </li>
            ))}
            <MenuCompte />
          </ul>
        </nav>
      </header>
      <main className="client-contenu">
        <Outlet />
      </main>
      <footer className="client-pied">
        <p className="client-logo">Feuillet</p>
        <p>Librairie indépendante à Papeete. Ouverte du lundi au samedi, de 8 h à 18 h.</p>
        <ul className="client-pied-liens">
          <li>
            <Link to="/catalogue">Catalogue</Link>
          </li>
          <li>
            <Link to="/demandes">Demander un livre</Link>
          </li>
        </ul>
      </footer>
    </div>
  )
}

export default ClientLayout
