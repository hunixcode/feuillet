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
import { lignesAdresse } from '../../utils/livraison'

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
      <div className="page-corps">
        <title>Commande · Feuillet</title>
        <Loader>Chargement de la commande…</Loader>
      </div>
    )
  }

  if (actuel.introuvable) {
    return (
      <div className="page-corps">
        <title>Commande introuvable · Feuillet</title>
        <section className="vide">
          <h2>Commande introuvable.</h2>
          <p>Cette commande n'existe pas ou n'est pas liée à votre compte.</p>
          <Link className="bouton" to="/catalogue">
            Retour au catalogue
          </Link>
        </section>
      </div>
    )
  }

  if (!actuel.vente) {
    return (
      <div className="page-corps">
        <title>Commande · Feuillet</title>
        <div className="vide">
          <ErrorMessage>{actuel.erreur ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      </div>
    )
  }

  const vente = actuel.vente
  const titre = confirmee ? 'Commande confirmée' : `Commande du ${formatDate(vente.date)}`

  return (
    <>
      <title>{`${titre} · Feuillet`}</title>
      <header className="page-tete">
        <h1 className="page-titre">{titre}</h1>
        <p className="page-intro">
          <span className={vente.statut === 'expediee' ? 'statut statut-honoree' : 'statut statut-attente'}>
            {vente.statut === 'expediee'
              ? `Expédiée${vente.dateExpedition ? ` le ${formatDate(vente.dateExpedition)}` : ''}`
              : 'À préparer'}
          </span>
        </p>
        {confirmee && (
          <p className="commande-merci">
            Merci {vente.client.nom}, votre commande est enregistrée. Nous préparons votre colis.
          </p>
        )}
      </header>

      <div className="panier">
        <div>
          <section aria-labelledby="titre-articles">
            <h2 className="visuellement-cache" id="titre-articles">
              Articles
            </h2>
            <ul className="lignes">
              {vente.lignes.map((ligne) => (
                <li className="ligne" key={ligne.produitId}>
                  <span className="tuile tuile-vide">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
                      <path d="M5 17a3 3 0 0 1 3-3h10" />
                    </svg>
                  </span>
                  <div>
                    <Link className="ligne-titre" to={`/produits/${ligne.produitId}`}>
                      {ligne.designation}
                    </Link>
                    <p className="ligne-unitaire">
                      {`${ligne.quantite} × ${formatXPF(ligne.prixUnitaire)}`}
                      {ligne.remise > 0 && `, remise de ${ligne.remise} %`}
                    </p>
                  </div>
                  <p className="ligne-total">{formatXPF(ligne.montant)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="options" aria-labelledby="titre-livraison">
            <h2 className="titre-bloc titre-livraison" id="titre-livraison">
              Livraison
            </h2>
            <address className="commande-adresse">
              {lignesAdresse(vente.adresseLivraison).map((ligne, index) => (
                <span key={`${index}-${ligne}`}>{ligne}</span>
              ))}
            </address>
            {(vente.occasionCadeau || vente.emballageCadeau) && (
              <p className="suivi-meta">
                {[
                  vente.occasionCadeau && `Cadeau pour : ${occasions[vente.occasionCadeau]}`,
                  vente.emballageCadeau && 'Emballage cadeau',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </section>
        </div>

        <aside className="recap" aria-labelledby="titre-montants">
          <h2 id="titre-montants">Montants</h2>
          <dl>
            <div>
              <dt>Articles</dt>
              <dd>{formatXPF(vente.sousTotal)}</dd>
            </div>
            {vente.fraisEmballage > 0 && (
              <div>
                <dt>Emballage cadeau</dt>
                <dd>{formatXPF(vente.fraisEmballage)}</dd>
              </div>
            )}
            <div>
              <dt>Livraison à domicile</dt>
              <dd>{formatXPF(vente.fraisLivraison)}</dd>
            </div>
          </dl>
          <div className="recap-total">
            <span>Total TTC</span>
            <strong>{formatXPF(vente.total)}</strong>
          </div>
          <p className="recap-tva">
            <span>dont TVA</span> <span>{formatXPF(vente.montantTva)}</span>
          </p>
          <Link className="bouton bouton-blanc" to="/catalogue">
            Continuer mes achats
          </Link>
          <p className="recap-note">
            <Link to="/commandes">Voir toutes mes commandes</Link>
          </p>
        </aside>
      </div>
    </>
  )
}

export default CommandePage
