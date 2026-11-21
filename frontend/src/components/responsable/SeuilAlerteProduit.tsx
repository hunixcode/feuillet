import { useEffect, useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Loader from '../common/Loader.tsx'
import { definirSeuilAlerte, lireSeuilAlerte } from '../../services/reapproService'
import type { Produit } from '../../types/produit'
import type { SeuilAlerte } from '../../types/reappro'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import './FormulaireProduit.css'

interface SeuilAlerteProduitProps {
  produit: Produit
  onChangement: () => void
}

const ERREUR_SEUIL = 'Le seuil d’alerte doit être un nombre entier entre 0 et 100.'

function seuilValide(saisie: string): number | null {
  const valeur = Number(saisie)
  return saisie.trim() !== '' && Number.isInteger(valeur) && valeur >= 0 && valeur <= 100 ? valeur : null
}

function saisieDepuis(seuil: SeuilAlerte): string {
  return seuil.parDefaut ? '' : String(seuil.seuilAlerte)
}

function SeuilAlerteProduit({ produit, onChangement }: SeuilAlerteProduitProps) {
  const [actuel, setActuel] = useState<SeuilAlerte | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [saisie, setSaisie] = useState('')
  const [erreurChamp, setErreurChamp] = useState('')
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let actif = true
    lireSeuilAlerte(produit.id)
      .then((seuil) => {
        if (actif) {
          setActuel(seuil)
          setSaisie(saisieDepuis(seuil))
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreurChargement(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [produit.id])

  async function envoyer(seuil: number | null) {
    setEnvoi(true)
    setErreur('')
    setSucces('')
    try {
      const resultat = await definirSeuilAlerte(produit.id, seuil)
      setActuel(resultat)
      setSaisie(saisieDepuis(resultat))
      setSucces(
        resultat.parDefaut
          ? `L’article suit de nouveau le seuil par défaut (${resultat.seuilAlerte} %).`
          : `Seuil d’alerte enregistré : ${resultat.seuilAlerte} %.`,
      )
      onChangement()
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      if (champs.seuilAlerte) {
        setErreurChamp(champs.seuilAlerte)
      } else {
        setErreur(messageErreur(probleme))
      }
    } finally {
      setEnvoi(false)
    }
  }

  function enregistrer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const seuil = seuilValide(saisie)
    if (seuil === null) {
      setErreurChamp(ERREUR_SEUIL)
      setSucces('')
      return
    }
    setErreurChamp('')
    void envoyer(seuil)
  }

  function revenirAuDefaut() {
    setErreurChamp('')
    void envoyer(null)
  }

  return (
    <section className="tiroir-section" aria-labelledby="titre-seuil">
      <h3 id="titre-seuil">Seuil d’alerte</h3>
      <p className="tiroir-note">
        Quand le stock vendable passe sous ce pourcentage de la quantité achetée à l’origine,
        l’article apparaît dans « À recommander ».
      </p>
      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}
      {!erreurChargement && actuel === null && <Loader />}
      {actuel && (
        <>
          <p className="seuil-actuel">
            Seuil actuel : <strong>{actuel.seuilAlerte} %</strong>
            {actuel.parDefaut ? ', celui par défaut des paramètres.' : ', propre à cet article.'}
          </p>
          <form className="formulaire-produit" onSubmit={enregistrer} noValidate>
            {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
            {succes && (
              <p className="encart" role="status">
                {succes}
              </p>
            )}
            <div className="formulaire-produit-grille">
              <Input
                label="Seuil d’alerte (%)"
                name="seuilAlerte"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                placeholder={actuel.parDefaut ? String(actuel.seuilAlerte) : undefined}
                value={saisie}
                onChange={(evenement) => setSaisie(evenement.target.value)}
                error={erreurChamp}
              />
            </div>
            <div className="tiroir-actions">
              <Button type="submit" variant="secondary" loading={envoi}>
                Enregistrer le seuil
              </Button>
              {!actuel.parDefaut && (
                <Button type="button" variant="secondary" disabled={envoi} onClick={revenirAuDefaut}>
                  Revenir au seuil par défaut
                </Button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  )
}

export default SeuilAlerteProduit
