import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import { listerCommandes } from '../../services/commandeService'
import type { Vente } from '../../types/vente'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'
import './MesCommandesPage.css'

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
        <div className="panier-erreur">
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
          <Link className="common-button common-button--primary" to="/catalogue">
            Parcourir le catalogue
          </Link>
        </section>
      )
    }

    return (
      <ul className="mes-commandes">
        {actuel.ventes.map((vente) => (
          <li key={vente.id}>
            <Link to={`/commandes/${vente.id}`}>
              <span className="mes-commandes-infos">
                <span className="mes-commandes-titre">{`Commande du ${formatDate(vente.date)}`}</span>
                <span className="mes-commandes-detail">{articles(vente)}</span>
              </span>
              <span className="mes-commandes-fin">
                <span className="mes-commandes-total">{formatXPF(vente.total)}</span>
                <span
                  className={`mes-commandes-statut${vente.statut === 'expediee' ? ' expediee' : ''}`}
                >
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
    <div className="commandes-client">
      <title>Mes commandes · Feuillet</title>
      <div className="page-intro">
        <h1>Mes commandes</h1>
        {nombre !== undefined && nombre > 0 && (
          <p>{nombre > 1 ? `${nombre} commandes` : '1 commande'}</p>
        )}
      </div>
      {contenu()}
    </div>
  )
}

export default MesCommandesPage
