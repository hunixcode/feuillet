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
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import { formatDate } from '../../utils/format'

interface PromotionsProduitProps {
  produit: Produit
  onChangement: () => void
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

  return (
    <section className="catalogue-bloc" aria-labelledby="titre-promotions">
      <h3 id="titre-promotions">Promotions</h3>
      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}
      {!erreurChargement && promotions === null && <Loader />}
      {promotions?.length === 0 && <p className="catalogue-vide">Aucune promotion programmée.</p>}
      {promotions && promotions.length > 0 && (
        <ul className="catalogue-promotions">
          {promotions.map((promotion) => (
            <li key={promotion.id}>
              <span>
                <strong>−{promotion.remise} %</strong> du {formatDate(promotion.debut)} au{' '}
                {formatDate(promotion.fin)}
                {produit.promotion?.id === promotion.id && (
                  <span className="catalogue-pastille catalogue-pastille--ok">En cours</span>
                )}
              </span>
              <button
                type="button"
                className="catalogue-lien"
                onClick={() => retirer(promotion)}
                aria-label={`Supprimer la promotion de ${promotion.remise} % du ${formatDate(promotion.debut)}`}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="formulaire-produit" onSubmit={programmer} noValidate>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        <div className="formulaire-produit-grille formulaire-produit-grille--3">
          <Input
            label="Remise (%)"
            name="remise"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={remise}
            onChange={(evenement) => setRemise(evenement.target.value)}
            error={erreurs.remise}
          />
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
        <div className="catalogue-actions">
          <Button type="submit" variant="secondary" loading={envoi}>
            Programmer la promotion
          </Button>
        </div>
      </form>
    </section>
  )
}

export default PromotionsProduit
