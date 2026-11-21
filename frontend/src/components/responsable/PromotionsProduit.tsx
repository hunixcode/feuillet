import { useEffect, useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Loader from '../common/Loader.tsx'
import {
  ajouterPromotion,
  listerPromotions,
  supprimerPromotion,
} from '../../services/catalogueAdminService'
import type { Produit, Promotion } from '../../types/produit'
import { dateLongue } from '../../utils/datesAdmin'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'
import IconeAdmin from './IconeAdmin.tsx'

interface PromotionsProduitProps {
  produit: Produit
  onChangement: () => void
}

function libelleSuppression(promotion: Promotion): string {
  return `Supprimer la promotion de ${promotion.remise} % du ${formatDate(promotion.debut)}`
}

function PromotionsProduit({ produit, onChangement }: PromotionsProduitProps) {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [remise, setRemise] = useState('')
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let actif = true
    listerPromotions(produit.id)
      .then((liste) => {
        if (actif) {
          setPromotions(liste)
        }
      })
      .catch((erreur: unknown) => {
        if (actif) {
          setErreurChargement(messageErreur(erreur))
        }
      })
    return () => {
      actif = false
    }
  }, [produit.id])

  async function recharger() {
    setPromotions(await listerPromotions(produit.id))
    onChangement()
  }

  async function programmer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')

    try {
      await ajouterPromotion(produit.id, {
        remise: remise.trim() === '' ? Number.NaN : Number(remise),
        debut,
        fin,
      })
      setRemise('')
      setDebut('')
      setFin('')
      await recharger()
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(Object.keys(champs).length > 0 ? '' : messageErreur(erreur))
    } finally {
      setEnvoi(false)
    }
  }

  async function retirer(promotion: Promotion) {
    setMessage('')
    try {
      await supprimerPromotion(produit.id, promotion.id)
      await recharger()
    } catch (erreur) {
      setMessage(messageErreur(erreur))
    }
  }

  const enCours = produit.promotion
  const autres = (promotions ?? []).filter((promotion) => promotion.id !== enCours?.id)

  return (
    <section className="tiroir-section" aria-labelledby="titre-promotions">
      <h3 id="titre-promotions">Promotion</h3>
      {enCours && (
        <div className="encart encart-sombre">
          <IconeAdmin nom="info" />
          <span>
            <strong>{`−${enCours.remise} %`}</strong>
            {` du ${dateLongue(enCours.debut)} au ${dateLongue(enCours.fin)}. L’article est vendu ${formatXPF(produit.prixApplique)}.`}
            {promotions?.some((promotion) => promotion.id === enCours.id) && (
              <button
                type="button"
                className="action-ligne"
                onClick={() => retirer(enCours)}
                aria-label={libelleSuppression(enCours)}
              >
                Retirer
              </button>
            )}
          </span>
        </div>
      )}
      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}
      {!erreurChargement && promotions === null && <Loader />}
      {promotions && !enCours && autres.length === 0 && (
        <p className="tiroir-note">Aucune promotion programmée.</p>
      )}
      {autres.length > 0 && (
        <ul className="tiroir-liste">
          {autres.map((promotion) => (
            <li key={promotion.id}>
              <span>
                <strong>{`−${promotion.remise} %`}</strong>
                {` du ${dateLongue(promotion.debut)} au ${dateLongue(promotion.fin)}`}
              </span>
              <button
                type="button"
                className="action-ligne"
                onClick={() => retirer(promotion)}
                aria-label={libelleSuppression(promotion)}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={programmer} noValidate>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        <div className="grille-champs">
          <Input
            label="Remise (%)"
            name="remise"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            placeholder="10"
            value={remise}
            onChange={(evenement) => setRemise(evenement.target.value)}
            error={erreurs.remise}
          />
          <div aria-hidden="true" />
          <Input
            label="Début"
            name="debut"
            type="date"
            value={debut}
            onChange={(evenement) => setDebut(evenement.target.value)}
            error={erreurs.debut}
          />
          <Input
            label="Fin"
            name="fin"
            type="date"
            value={fin}
            onChange={(evenement) => setFin(evenement.target.value)}
            error={erreurs.fin}
          />
        </div>
        <div className="tiroir-actions">
          <Button type="submit" variant="secondary" loading={envoi}>
            Programmer la promotion
          </Button>
        </div>
        <p className="tiroir-note">Une seule promotion par article à une même date.</p>
      </form>
    </section>
  )
}

export default PromotionsProduit
