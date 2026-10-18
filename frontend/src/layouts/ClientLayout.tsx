import { Link, NavLink, Outlet } from 'react-router-dom'

const liens = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/demandes', label: 'Mes demandes' },
  { to: '/panier', label: 'Panier' },
  { to: '/connexion', label: 'Connexion' },
]

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
