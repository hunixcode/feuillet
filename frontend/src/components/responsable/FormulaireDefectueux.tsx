import { useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Select from '../common/Select.tsx'
import Segment from '../client/Segment.tsx'
import { declarerDefectueux, sortirDefectueux } from '../../services/stockService'
import type { EtatStock, LigneStock } from '../../types/stock'
import { erreursDesChamps, messageErreurStock, stockModifie } from '../../utils/erreurs'

export type ModeDefectueux = 'declaration' | 'sortie'

type Issue = 'Renvoi fournisseur' | 'Destruction'

interface FormulaireDefectueuxProps {
  ligne: LigneStock
  onChangement: (etat: EtatStock) => void
  onRecharger: () => void
  modeImpose?: ModeDefectueux
}

function FormulaireDefectueux({ ligne, onChangement, onRecharger, modeImpose }: FormulaireDefectueuxProps) {
  const [modeChoisi, setMode] = useState<ModeDefectueux>('declaration')
  const mode = modeImpose ?? modeChoisi
  const [quantite, setQuantite] = useState('')
  const [motif, setMotif] = useState('')
  const [issue, setIssue] = useState<Issue>('Renvoi fournisseur')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [succes, setSucces] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const sortieImpossible = mode === 'sortie' && ligne.quantiteDefectueuse === 0

  function changerMode(nouveau: ModeDefectueux) {
    setMode(nouveau)
    setErreurs({})
    setMessage('')
    setSucces('')
  }

  async function enregistrer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')
    setSucces('')

    const payload = {
      quantite: quantite.trim() === '' ? Number.NaN : Number(quantite),
      motif:
        mode === 'sortie'
          ? [issue, motif.trim()].filter(Boolean).join(' : ')
          : motif.trim(),
    }

    try {
      const etat =
        mode === 'sortie'
          ? await sortirDefectueux(ligne.produitId, payload)
          : await declarerDefectueux(ligne.produitId, payload)
      setQuantite('')
      setMotif('')
      setSucces(
        mode === 'sortie'
          ? 'Sortie du stock défectueux enregistrée.'
          : 'Exemplaires passés en stock défectueux.',
      )
      onChangement(etat)
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(
        Object.keys(champs).length > 0
          ? ''
          : messageErreurStock(erreur, mode === 'sortie' ? 'sortie' : 'defectueux'),
      )
      if (stockModifie(erreur)) {
        onRecharger()
      }
    } finally {
      setEnvoi(false)
    }
  }

  const formulaire = (
    <form className="formulaire-tiroir" onSubmit={enregistrer} noValidate>
      {message && <ErrorMessage>{message}</ErrorMessage>}
      {succes && (
        <p className="encart" role="status">
          {succes}
        </p>
      )}
      <p className="tiroir-note">
        {ligne.quantiteVendable} vendable{ligne.quantiteVendable > 1 ? 's' : ''}, {ligne.quantiteDefectueuse}{' '}
        défectueux.
      </p>
      {sortieImpossible && <p className="tiroir-note">Aucun exemplaire défectueux à sortir.</p>}
      <div className="grille-champs">
        <Input
          label="Quantité"
          name="quantite"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={quantite}
          onChange={(evenement) => setQuantite(evenement.target.value)}
          error={erreurs.quantite}
        />
        {mode === 'sortie' && (
          <Select
            label="Issue"
            name="issue"
            value={issue}
            onChange={(evenement) => setIssue(evenement.target.value as Issue)}
          >
            <option value="Renvoi fournisseur">Renvoi au fournisseur</option>
            <option value="Destruction">Destruction</option>
          </Select>
        )}
      </div>
      <Input
        label={mode === 'sortie' ? 'Précision (facultatif)' : 'Motif'}
        name="motif"
        placeholder={mode === 'sortie' ? 'Bon de retour, remarque…' : 'Couverture pliée, page déchirée…'}
        value={motif}
        onChange={(evenement) => setMotif(evenement.target.value)}
        error={erreurs.motif}
      />
      {mode === 'declaration' && (
        <p className="texte-issue">
          L’exemplaire passe en stock défectueux : il n’est plus jamais proposé comme disponible.
        </p>
      )}
      <div className="tiroir-actions">
        <Button type="submit" loading={envoi} disabled={sortieImpossible}>
          {mode === 'sortie' ? 'Enregistrer la sortie' : 'Passer en défectueux'}
        </Button>
      </div>
    </form>
  )

  if (modeImpose) {
    return (
      <section aria-label={modeImpose === 'sortie' ? 'Sortie du stock défectueux' : 'Stock défectueux'}>
        {formulaire}
      </section>
    )
  }

  return (
    <section className="tiroir-section" aria-labelledby="titre-defectueux">
      <h3 id="titre-defectueux">Stock défectueux</h3>
      <div className="formulaire-stock-choix">
        <Segment
          libelle="Action sur le stock défectueux"
          valeur={mode}
          onChange={(valeur) => changerMode(valeur as ModeDefectueux)}
          options={[
            { valeur: 'declaration', libelle: 'Déclarer abîmé' },
            { valeur: 'sortie', libelle: 'Sortir du stock défectueux' },
          ]}
        />
      </div>
      {formulaire}
    </section>
  )
}

export default FormulaireDefectueux
