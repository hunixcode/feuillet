import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import { listerCommandes } from '../../services/commandeService'
import type { Vente } from '../../types/vente'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'

function statut(vente: Vente) {
  if (vente.statut === 'expediee') {
    return vente.dateExpedition ? `Expédiée le ${formatDate(vente.dateExpedition)}` : 'Expédiée'
  }
  return 'À préparer'
}

function articles(vente: Vente) {
  const nombre = vente.lignes.reduce((total, ligne) => total + ligne.quantite, 0)
  return nombre > 1 ? `${nombre} articles` : `${nombre} article`
}

function MesCommandesPage() {
  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<{
    essai: number
    ventes?: Vente[]
    erreur?: string
  } | null>(null)

  const actuel = resultat?.essai === essai ? resultat : null

  useEffect(() => {
    let actif = true
    listerCommandes()
      .then((ventes) => {
        if (actif) {
          setResultat({ essai, ventes })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setResultat({ essai, erreur: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [essai])

  function contenu() {
    if (!actuel) {
      return <Loader>Chargement de vos commandes…</Loader>
    }

    if (!actuel.ventes) {
      return (
        <div className="vide">
          <ErrorMessage>{actuel.erreur ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    if (actuel.ventes.length === 0) {
      return (
        <section className="vide">
          <h2>Aucune commande pour l'instant.</h2>
          <p>Vos commandes apparaîtront ici dès que vous en aurez passé une.</p>
          <Link className="bouton" to="/catalogue">
            Parcourir le catalogue
          </Link>
        </section>
      )
    }

    return (
      <ul className="suivi suivi-commandes">
        {actuel.ventes.map((vente) => (
          <li key={vente.id}>
            <Link className="suivi-lien" to={`/commandes/${vente.id}`}>
              <span className="tuile tuile-vide">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M6 8h12l-1 12H7L6 8Z" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                </svg>
              </span>
              <span>
                <span className="suivi-titre">{`Commande du ${formatDate(vente.date)}`}</span>
                <span className="suivi-meta">{articles(vente)}</span>
              </span>
              <span className="suivi-fin">
                <span className="suivi-total">{formatXPF(vente.total)}</span>
                <span className={vente.statut === 'expediee' ? 'statut statut-honoree' : 'statut statut-attente'}>
                  {statut(vente)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  const nombre = actuel?.ventes?.length

  return (
    <>
      <title>Mes commandes · Feuillet</title>
      <header className="page-tete">
        <h1 className="page-titre">Mes commandes</h1>
        {nombre !== undefined && nombre > 0 && (
          <p className="page-intro">{nombre > 1 ? `${nombre} commandes` : '1 commande'}</p>
        )}
      </header>
      <div className="commandes">{contenu()}</div>
    </>
  )
}

export default MesCommandesPage
