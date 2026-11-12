import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import { ApiRequestError } from '../../services/api'
import { obtenirCommande } from '../../services/commandeService'
import type { OccasionCadeau, Vente } from '../../types/vente'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'
import './CommandePage.css'

const occasions: Record<OccasionCadeau, string> = {
  noel: 'Noël',
  anniversaire: 'Anniversaire',
  fete: 'Fête',
}

function CommandePage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const confirmee = (location.state as { confirmee?: boolean } | null)?.confirmee === true

  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<{
    cle: string
    vente?: Vente
    introuvable?: boolean
    erreur?: string
  } | null>(null)

  const cle = `${id}|${essai}`
  const actuel = resultat?.cle === cle ? resultat : null

  useEffect(() => {
    let actif = true
    obtenirCommande(id)
      .then((vente) => {
        if (actif) {
          setResultat({ cle, vente })
        }
      })
      .catch((raison: unknown) => {
        if (!actif) {
          return
        }
        if (raison instanceof ApiRequestError && raison.code === 'INTROUVABLE') {
          setResultat({ cle, introuvable: true })
        } else {
          setResultat({ cle, erreur: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [id, cle])

  if (!actuel) {
    return (
      <div className="commande">
        <title>Commande · Feuillet</title>
        <Loader>Chargement de la commande…</Loader>
      </div>
    )
  }

  if (actuel.introuvable) {
    return (
      <div className="commande">
        <title>Commande introuvable · Feuillet</title>
        <section className="vide">
          <h2>Commande introuvable.</h2>
          <p>Cette commande n'existe pas ou n'est pas liée à votre compte.</p>
          <Link className="common-button common-button--primary" to="/catalogue">
            Retour au catalogue
          </Link>
        </section>
      </div>
    )
  }

  if (!actuel.vente) {
    return (
      <div className="commande">
        <title>Commande · Feuillet</title>
        <div className="panier-erreur">
          <ErrorMessage>{actuel.erreur ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      </div>
    )
  }

  const vente = actuel.vente
  const titre = confirmee ? 'Commande confirmée' : `Commande du ${formatDate(vente.date)}`

  return (
    <div className="commande">
      <title>{`${titre} · Feuillet`}</title>
      <div className="page-intro">
        <h1>{titre}</h1>
        <p>
          {vente.statut === 'expediee'
            ? `Expédiée${vente.dateExpedition ? ` le ${formatDate(vente.dateExpedition)}` : ''}`
            : 'À préparer'}
        </p>
      </div>

      {confirmee && (
        <p className="commande-merci">
          Merci {vente.client.nom}, votre commande est enregistrée. Nous préparons votre colis.
        </p>
      )}

      <div className="commande-grille">
        <section aria-labelledby="titre-articles">
          <h2 id="titre-articles">Articles</h2>
          <ul className="commande-lignes">
            {vente.lignes.map((ligne) => (
              <li key={ligne.produitId}>
                <div>
                  <span className="commande-designation">{ligne.designation}</span>
                  <span className="commande-detail">
                    {`${ligne.quantite} × ${formatXPF(ligne.prixUnitaire)}`}
                    {ligne.remise > 0 && `, remise de ${ligne.remise} %`}
                  </span>
                </div>
                <span className="commande-montant">{formatXPF(ligne.montant)}</span>
              </li>
            ))}
          </ul>

          <h2>Livraison</h2>
          <p className="commande-adresse">{vente.adresseLivraison}</p>
          {(vente.occasionCadeau || vente.emballageCadeau) && (
            <p className="aide">
              {[
                vente.occasionCadeau && `Cadeau pour : ${occasions[vente.occasionCadeau]}`,
                vente.emballageCadeau && 'Emballage cadeau',
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </section>

        <aside className="recap" aria-labelledby="titre-montants">
          <h2 id="titre-montants">Montants</h2>
          <dl>
            <dt>Articles</dt>
            <dd>{formatXPF(vente.sousTotal)}</dd>
            {vente.fraisEmballage > 0 && (
              <>
                <dt>Emballage cadeau</dt>
                <dd>{formatXPF(vente.fraisEmballage)}</dd>
              </>
            )}
            <dt>Livraison à domicile</dt>
            <dd>{formatXPF(vente.fraisLivraison)}</dd>
            <dt className="total">Total TTC</dt>
            <dd className="total">{formatXPF(vente.total)}</dd>
            <dt>dont TVA</dt>
            <dd>{formatXPF(vente.montantTva)}</dd>
          </dl>
          <Link className="common-button common-button--secondary" to="/catalogue">
            Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  )
}

export default CommandePage
