import { useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import { corrigerInventaire } from '../../services/stockService'
import type { EtatStock, LigneStock } from '../../types/stock'
import { erreursDesChamps, messageErreurStock, stockModifie } from '../../utils/erreurs'

interface FormulaireInventaireProps {
  ligne: LigneStock
  onChangement: (etat: EtatStock) => void
  onRecharger: () => void
  integre?: boolean
}

function ecartTexte(ecart: number): string {
  return `${ecart > 0 ? '+' : ecart < 0 ? '−' : ''}${Math.abs(ecart)}`
}

function FormulaireInventaire({ ligne, onChangement, onRecharger, integre = false }: FormulaireInventaireProps) {
  const [quantiteComptee, setQuantiteComptee] = useState('')
  const [motif, setMotif] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [succes, setSucces] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function enregistrer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')
    setSucces('')

    try {
      const etat = await corrigerInventaire(ligne.produitId, {
        quantiteComptee: quantiteComptee.trim() === '' ? Number.NaN : Number(quantiteComptee),
        motif: motif.trim(),
      })
      setQuantiteComptee('')
      setMotif('')
      setSucces('Correction d’inventaire enregistrée.')
      onChangement(etat)
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(Object.keys(champs).length > 0 ? '' : messageErreurStock(erreur, 'inventaire'))
      if (stockModifie(erreur)) {
        onRecharger()
      }
    } finally {
      setEnvoi(false)
    }
  }

  const comptee = quantiteComptee.trim() === '' ? Number.NaN : Number(quantiteComptee)

  const formulaire = (
    <form className="formulaire-tiroir" onSubmit={enregistrer} noValidate>
      {message && <ErrorMessage>{message}</ErrorMessage>}
      {succes && (
        <p className="encart" role="status">
          {succes}
        </p>
      )}
      <div className="grille-champs">
        <Input
          label="Quantité enregistrée"
          name="quantitePhysique"
          type="number"
          value={ligne.quantitePhysique}
          readOnly
        />
        <Input
          label="Quantité comptée"
          name="quantiteComptee"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={quantiteComptee}
          onChange={(evenement) => setQuantiteComptee(evenement.target.value)}
          error={erreurs.quantiteComptee}
        />
      </div>
      <Input
        label="Motif"
        name="motif"
        placeholder="Comptage annuel, article perdu…"
        value={motif}
        onChange={(evenement) => setMotif(evenement.target.value)}
        error={erreurs.motif}
      />
      <div className="solde">
        <span>Écart avec le stock enregistré</span>
        <strong>{Number.isFinite(comptee) ? ecartTexte(comptee - ligne.quantitePhysique) : '0'}</strong>
      </div>
      <p className="tiroir-note">
        La correction est ajoutée au journal avec la quantité avant et après le comptage.
      </p>
      <div className="tiroir-actions">
        <Button type="submit" loading={envoi}>
          Enregistrer la correction
        </Button>
      </div>
    </form>
  )

  if (integre) {
    return <section aria-label="Correction d’inventaire">{formulaire}</section>
  }

  return (
    <section className="tiroir-section" aria-labelledby="titre-inventaire">
      <h3 id="titre-inventaire">Correction d’inventaire</h3>
      {formulaire}
    </section>
  )
}

export default FormulaireInventaire
