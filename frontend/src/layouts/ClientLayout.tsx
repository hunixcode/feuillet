import { NavLink, Outlet } from 'react-router-dom'

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
        <NavLink to="/catalogue" className="client-logo">
          Librairie
        </NavLink>
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
      <footer className="client-pied">Groupe 5 · Gestionnaire de stock de librairie</footer>
    </div>
  )
}

export default ClientLayout
