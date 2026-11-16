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
}

function FormulaireInventaire({ ligne, onChangement, onRecharger }: FormulaireInventaireProps) {
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

  return (
    <section className="stock-bloc" aria-labelledby="titre-inventaire">
      <h3 id="titre-inventaire">Correction d’inventaire</h3>
      <form className="stock-formulaire" onSubmit={enregistrer} noValidate>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        {succes && (
          <p className="stock-succes" role="status">
            {succes}
          </p>
        )}
        <div className="stock-formulaire-grille">
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
        <p className="stock-aide">
          La correction est ajoutée au journal avec la quantité avant et après le comptage.
        </p>
        <div className="stock-actions">
          <Button type="submit" loading={envoi}>
            Enregistrer la correction
          </Button>
        </div>
      </form>
    </section>
  )
}

export default FormulaireInventaire
