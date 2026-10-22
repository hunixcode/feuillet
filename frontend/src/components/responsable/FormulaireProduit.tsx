import { useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Select from '../common/Select.tsx'
import type { Categorie } from '../../types/categorie'
import type { FicheProduit, TypeProduit } from '../../types/produit'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import { LIBELLES_TYPE } from './libelles'

interface Saisie {
  reference: string
  designation: string
  type: TypeProduit
  categorie: string
  prix: string
  tauxTva: string
  isbn: string
  auteur: string
  issn: string
  numero: string
  dateParution: string
  marque: string
}

function saisieDepuis(fiche?: FicheProduit): Saisie {
  return {
    reference: fiche?.reference ?? '',
    designation: fiche?.designation ?? '',
    type: fiche?.type ?? 'livre',
    categorie: fiche?.categorie ?? '',
    prix: fiche ? String(fiche.prix) : '',
    tauxTva: fiche ? String(fiche.tauxTva) : '',
    isbn: fiche?.isbn ?? '',
    auteur: fiche?.auteur ?? '',
    issn: fiche?.issn ?? '',
    numero: fiche?.numero === undefined ? '' : String(fiche.numero),
    dateParution: fiche?.dateParution ?? '',
    marque: fiche?.marque ?? '',
  }
}

function enNombre(valeur: string): number {
  return valeur.trim() === '' ? Number.NaN : Number(valeur)
}

function ficheDepuis(saisie: Saisie, archive: boolean): FicheProduit {
  const fiche: FicheProduit = {
    reference: saisie.reference,
    designation: saisie.designation,
    type: saisie.type,
    categorie: saisie.categorie,
    prix: enNombre(saisie.prix),
    tauxTva: enNombre(saisie.tauxTva),
    archive,
  }
  const facultatifs: Record<TypeProduit, (keyof Saisie)[]> = {
    livre: ['isbn', 'auteur'],
    magazine: ['issn', 'dateParution'],
    papeterie: ['marque'],
  }
  for (const champ of facultatifs[saisie.type]) {
    if (saisie[champ].trim()) {
      Object.assign(fiche, { [champ]: saisie[champ] })
    }
  }
  if (saisie.type === 'magazine' && saisie.numero.trim()) {
    fiche.numero = enNombre(saisie.numero)
  }
  return fiche
}

interface FormulaireProduitProps {
  fiche?: FicheProduit
  categories: Categorie[]
  libelleEnvoi: string
  onEnregistrer: (fiche: FicheProduit) => Promise<void>
  onAnnuler?: () => void
}

function FormulaireProduit({
  fiche,
  categories,
  libelleEnvoi,
  onEnregistrer,
  onAnnuler,
}: FormulaireProduitProps) {
  const [saisie, setSaisie] = useState(() => saisieDepuis(fiche))
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  function changer(champ: keyof Saisie, valeur: string) {
    setSaisie((precedente) => ({ ...precedente, [champ]: valeur }))
  }

  async function envoyer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')

    try {
      await onEnregistrer(ficheDepuis(saisie, fiche?.archive ?? false))
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(Object.keys(champs).length > 0 ? '' : messageErreur(erreur))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="formulaire-produit" onSubmit={envoyer} noValidate>
      {message && <ErrorMessage>{message}</ErrorMessage>}
      <div className="formulaire-produit-grille">
        <Input
          label="Référence"
          name="reference"
          value={saisie.reference}
          onChange={(evenement) => changer('reference', evenement.target.value)}
          error={erreurs.reference}
        />
        <Select
          label="Type"
          name="type"
          value={saisie.type}
          onChange={(evenement) => changer('type', evenement.target.value)}
          error={erreurs.type}
        >
          {Object.entries(LIBELLES_TYPE).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Désignation"
        name="designation"
        value={saisie.designation}
        onChange={(evenement) => changer('designation', evenement.target.value)}
        error={erreurs.designation}
      />
      <Select
        label="Catégorie"
        name="categorie"
        value={saisie.categorie}
        onChange={(evenement) => changer('categorie', evenement.target.value)}
        error={erreurs.categorie}
      >
        <option value="">Choisir une catégorie</option>
        {categories.map((categorie) => (
          <option key={categorie.id} value={categorie.id}>
            {categorie.libelle}
          </option>
        ))}
      </Select>
      <div className="formulaire-produit-grille">
        <Input
          label="Prix TTC (XPF)"
          name="prix"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={saisie.prix}
          onChange={(evenement) => changer('prix', evenement.target.value)}
          error={erreurs.prix}
        />
        <Input
          label="Taux de TVA (%)"
          name="tauxTva"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={saisie.tauxTva}
          onChange={(evenement) => changer('tauxTva', evenement.target.value)}
          error={erreurs.tauxTva}
        />
      </div>
      {saisie.type === 'livre' && (
        <div className="formulaire-produit-grille">
          <Input
            label="ISBN"
            name="isbn"
            value={saisie.isbn}
            onChange={(evenement) => changer('isbn', evenement.target.value)}
            error={erreurs.isbn}
          />
          <Input
            label="Auteur"
            name="auteur"
            value={saisie.auteur}
            onChange={(evenement) => changer('auteur', evenement.target.value)}
            error={erreurs.auteur}
          />
        </div>
      )}
      {saisie.type === 'magazine' && (
        <>
          <div className="formulaire-produit-grille">
            <Input
              label="ISSN"
              name="issn"
              value={saisie.issn}
              onChange={(evenement) => changer('issn', evenement.target.value)}
              error={erreurs.issn}
            />
            <Input
              label="Numéro"
              name="numero"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={saisie.numero}
              onChange={(evenement) => changer('numero', evenement.target.value)}
              error={erreurs.numero}
            />
          </div>
          <Input
            label="Date de parution"
            name="dateParution"
            type="date"
            value={saisie.dateParution}
            onChange={(evenement) => changer('dateParution', evenement.target.value)}
            error={erreurs.dateParution}
          />
        </>
      )}
      {saisie.type === 'papeterie' && (
        <Input
          label="Marque"
          name="marque"
          value={saisie.marque}
          onChange={(evenement) => changer('marque', evenement.target.value)}
          error={erreurs.marque}
        />
      )}
      <div className="catalogue-actions">
        <Button type="submit" loading={envoi}>
          {libelleEnvoi}
        </Button>
        {onAnnuler && (
          <Button type="button" variant="secondary" onClick={onAnnuler}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}

export default FormulaireProduit
