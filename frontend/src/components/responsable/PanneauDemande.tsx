import { useState, type FormEvent } from 'react'
import { creerProduit } from '../../services/catalogueAdminService'
import { rattacherDemande } from '../../services/demandeAdminService'
import type { Categorie } from '../../types/categorie'
import type { Demande } from '../../types/demande'
import type { FicheProduit, Produit } from '../../types/produit'
import { codeErreur, messageErreurDemande } from '../../utils/erreurs'
import { formatJourTahiti } from '../../utils/format'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Select from '../common/Select.tsx'
import FormulaireProduit from './FormulaireProduit.tsx'
import { LIBELLES_STATUT_DEMANDE } from './libelles'
import { OrigineDemande } from './TableauDemandes.tsx'

type Choix = 'creer' | 'existant'

interface PanneauDemandeProps {
  demande: Demande
  produits: Produit[]
  categories: Categorie[]
  onChangement: (demande?: Demande) => void
}

const LIBELLES_FIN: Partial<Record<Demande['statut'], string>> = {
  honoree: 'Commandée le',
  expiree: 'Expirée le',
  annulee: 'Annulée le',
}

function exemplaires(nombre: number): string {
  return `${nombre} exemplaire${nombre > 1 ? 's' : ''}`
}

function PanneauDemande({ demande, produits, categories, onChangement }: PanneauDemandeProps) {
  const [choix, setChoix] = useState<Choix>('creer')
  const [produitId, setProduitId] = useState('')
  const [erreurProduit, setErreurProduit] = useState('')
  const [erreur, setErreur] = useState('')
  const [produitCree, setProduitCree] = useState<Produit | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState('')

  const rattachable = !demande.produitId && demande.statut === 'en_attente'

  async function rattacher(produit: Produit) {
    setErreur('')
    setEnvoi(true)
    try {
      const rattachee = await rattacherDemande(demande.id, produit.id)
      setProduitCree(null)
      setSucces(
        `La demande est rattachée à « ${produit.designation} ». Elle sera mise de côté pour le client à la réception de l’article.`,
      )
      onChangement(rattachee)
    } catch (probleme) {
      setErreur(messageErreurDemande(probleme))
      if (codeErreur(probleme) === 'DEMANDE_NON_RATTACHABLE') {
        onChangement()
      }
    } finally {
      setEnvoi(false)
    }
  }

  async function creerPuisRattacher(fiche: FicheProduit) {
    const produit = await creerProduit(fiche)
    setProduitCree(produit)
    await rattacher(produit)
  }

  async function rattacherExistant(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const produit = produits.find((element) => element.id === produitId)
    if (!produit) {
      setErreurProduit('Choisissez l’article du catalogue qui correspond à la demande.')
      return
    }
    setErreurProduit('')
    await rattacher(produit)
  }

  const fin = LIBELLES_FIN[demande.statut]

  return (
    <div className="demandes-detail">
      <div className="demandes-bloc">
        <p className="demandes-surtitre">Demande du {formatJourTahiti(demande.date)}</p>
        <h2>{demande.titre}</h2>
        <div className="demandes-etiquettes">
          <span className={`demandes-statut demandes-statut--${demande.statut}`}>
            {LIBELLES_STATUT_DEMANDE[demande.statut]}
          </span>
          <OrigineDemande demande={demande} />
        </div>
        <p className="demandes-note">
          Une demande n’est pas une vente : le client n’a rien payé. Il commandera lui-même en ligne
          quand l’article sera mis de côté pour lui.
        </p>
      </div>

      <dl className="demandes-infos">
        <div>
          <dt>Client</dt>
          <dd>
            {demande.client?.nom ?? 'Client inconnu'}
            {demande.client?.email && <span className="demandes-secondaire">{demande.client.email}</span>}
          </dd>
        </div>
        <div>
          <dt>Quantité souhaitée</dt>
          <dd>{exemplaires(demande.quantiteSouhaitee)}</dd>
        </div>
        {demande.auteur && (
          <div>
            <dt>Auteur</dt>
            <dd>{demande.auteur}</dd>
          </div>
        )}
        {demande.isbn && (
          <div>
            <dt>ISBN</dt>
            <dd>{demande.isbn}</dd>
          </div>
        )}
        {demande.statut === 'mise_de_cote' && demande.miseDeCote && (
          <>
            <div>
              <dt>Mis de côté</dt>
              <dd>
                {exemplaires(demande.miseDeCote.quantite)} sur {demande.quantiteSouhaitee}
              </dd>
            </div>
            <div>
              <dt>Date limite</dt>
              <dd>{formatJourTahiti(demande.miseDeCote.dateLimite)} inclus</dd>
            </div>
          </>
        )}
        {fin && demande.dateFin && (
          <div>
            <dt>{fin}</dt>
            <dd>{formatJourTahiti(demande.dateFin)}</dd>
          </div>
        )}
      </dl>

      {succes && (
        <p className="demandes-succes" role="status">
          {succes}
        </p>
      )}

      {rattachable && (
        <section className="demandes-bloc demandes-rattachement" aria-labelledby="titre-rattachement">
          <h3 id="titre-rattachement">Ajouter ce livre au catalogue</h3>
          <p className="demandes-aide">
            Ce livre n’est pas encore vendu par la librairie. Une fois la demande rattachée à son
            article, elle sera mise de côté pour le client à la réception, comme pour un article
            épuisé.
          </p>

          {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

          {produitCree ? (
            <div className="demandes-actions">
              <Button type="button" loading={envoi} onClick={() => rattacher(produitCree)}>
                Rattacher à « {produitCree.designation} »
              </Button>
            </div>
          ) : (
            <>
              <fieldset className="demandes-choix">
                <legend className="visuellement-cache">Comment ajouter ce livre</legend>
                <label className="demandes-option">
                  <input type="radio" name="choix" checked={choix === 'creer'} onChange={() => setChoix('creer')} />
                  Créer la fiche de l’article
                </label>
                <label className="demandes-option">
                  <input
                    type="radio"
                    name="choix"
                    checked={choix === 'existant'}
                    onChange={() => setChoix('existant')}
                  />
                  Il est déjà au catalogue
                </label>
              </fieldset>

              {choix === 'creer' ? (
                <FormulaireProduit
                  brouillon={{
                    designation: demande.titre,
                    type: 'livre',
                    ...(demande.auteur && { auteur: demande.auteur }),
                    ...(demande.isbn && { isbn: demande.isbn }),
                  }}
                  categories={categories}
                  libelleEnvoi="Créer l’article et rattacher la demande"
                  onEnregistrer={creerPuisRattacher}
                />
              ) : (
                <form className="demandes-bloc" onSubmit={rattacherExistant} noValidate>
                  <Select
                    label="Article du catalogue"
                    value={produitId}
                    error={erreurProduit}
                    onChange={(evenement) => setProduitId(evenement.target.value)}
                  >
                    <option value="">Choisir un article</option>
                    {produits.filter((produit) => !produit.archive).map((produit) => (
                      <option key={produit.id} value={produit.id}>
                        {produit.designation} ({produit.reference})
                      </option>
                    ))}
                  </Select>
                  <div className="demandes-actions">
                    <Button type="submit" loading={envoi}>
                      Rattacher la demande
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default PanneauDemande
