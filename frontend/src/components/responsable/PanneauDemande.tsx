import { useState, type FormEvent } from 'react'
import { creerProduit } from '../../services/catalogueAdminService'
import { rattacherDemande } from '../../services/demandeAdminService'
import type { Categorie } from '../../types/categorie'
import type { Demande } from '../../types/demande'
import type { FicheProduit, Produit } from '../../types/produit'
import type { CommandeFournisseur } from '../../types/reappro'
import { codeErreur, messageErreurDemande } from '../../utils/erreurs'
import { formatJourTahiti } from '../../utils/format'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Select from '../common/Select.tsx'
import FormulaireProduit from './FormulaireProduit.tsx'
import IconeAdmin from './IconeAdmin.tsx'
import { commandeEnCours } from './libelles'
import { SuiviDemande } from './SuiviDemande.tsx'
import Vignette from './Vignette.tsx'

type Choix = 'creer' | 'existant'

interface PanneauDemandeProps {
  demande: Demande
  produits: Produit[]
  categories: Categorie[]
  commandes?: CommandeFournisseur[]
  demandes?: Demande[]
  aujourdhui: string
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

function PanneauDemande({
  demande,
  produits,
  categories,
  commandes = [],
  demandes = [],
  aujourdhui,
  onChangement,
}: PanneauDemandeProps) {
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

  const livre = demande.produitId
    ? produits.find((produit) => produit.id === demande.produitId)
    : undefined
  const commande = commandeEnCours(demande, commandes)
  const autres = demandes.filter(
    (element) =>
      element.produitId && element.produitId === demande.produitId && element.statut === 'en_attente',
  )
  const fin = LIBELLES_FIN[demande.statut]
  const auteur = demande.auteur ?? livre?.auteur

  return (
    <>
      <div className="scene">
        <SuiviDemande demande={demande} aujourdhui={aujourdhui} />
        <Vignette nu isbn={livre?.isbn ?? demande.isbn} type={livre?.type} />
      </div>
      <h2 className="tiroir-titre">{demande.titre}</h2>
      {auteur && <p className="tiroir-meta">{auteur}</p>}
      <dl className="infos">
        <div>
          <dt>Client</dt>
          <dd>{demande.client?.nom ?? 'Client inconnu'}</dd>
        </div>
        <div>
          <dt>Quantité</dt>
          <dd>{exemplaires(demande.quantiteSouhaitee)}</dd>
        </div>
        <div>
          <dt>Demandé le</dt>
          <dd>{formatJourTahiti(demande.date)}</dd>
        </div>
        <div>
          <dt>Livre</dt>
          <dd>
            {livre
              ? `${livre.reference}, ${livre.disponibilite === 'epuise' ? 'épuisé' : 'en vente'}`
              : demande.isbn
                ? `Hors catalogue, ISBN ${demande.isbn}`
                : 'Hors catalogue'}
          </dd>
        </div>
      </dl>

      <section className="tiroir-section">
        <h3>Suivi</h3>
        {rattachable && (
          <div className="encart">
            <IconeAdmin nom="info" />
            <span>
              Ce livre n’est pas au catalogue. Créez l’article ou choisissez-le : la demande lui sera
              rattachée, puis passez commande au fournisseur.
            </span>
          </div>
        )}
        {demande.produitId && demande.statut === 'en_attente' && (
          <>
            {commande ? (
              <div className="encart">
                <IconeAdmin nom="camion" />
                <span>
                  <strong>{exemplaires(commande.quantiteCommandee - commande.quantiteRecue)}</strong>
                  {` commandés chez ${commande.fournisseur.nom}, arrivée prévue le ${formatJourTahiti(commande.dateArriveePrevue)}. À la réception, ils sont mis de côté pour les clients qui les attendent.`}
                </span>
              </div>
            ) : (
              <div className="encart">
                <IconeAdmin nom="info" />
                <span>Aucune commande fournisseur en cours pour ce livre.</span>
              </div>
            )}
            <p className="tiroir-note">
              {autres.length > 1
                ? `${autres.length} demandes attendent ce livre, ${autres.reduce((somme, element) => somme + element.quantiteSouhaitee, 0)} exemplaires au total.`
                : 'C’est la seule demande pour ce livre.'}
            </p>
          </>
        )}
        {demande.statut === 'mise_de_cote' && demande.miseDeCote && (
          <>
            <div className="encart encart-sombre">
              <IconeAdmin nom="horloge" />
              <span>
                {`${exemplaires(demande.miseDeCote.quantite)} sur ${demande.quantiteSouhaitee} gardé${demande.miseDeCote.quantite > 1 ? 's' : ''} jusqu’au `}
                <strong>{`${formatJourTahiti(demande.miseDeCote.dateLimite)} inclus`}</strong>
              </span>
            </div>
            <p className="tiroir-note">
              Si le client ne commande pas d’ici là, la mise de côté expire seule et l’exemplaire
              revient en vente. Une commande de ce client consomme la mise de côté.
            </p>
          </>
        )}
        {fin && demande.dateFin && (
          <p className="tiroir-note">{`${fin} ${formatJourTahiti(demande.dateFin)}.`}</p>
        )}
        <p className="tiroir-note">
          Une demande n’est pas une vente : le client n’a rien payé. Il commandera lui-même en ligne
          quand l’article sera mis de côté pour lui.
        </p>
      </section>

      {succes && (
        <p className="encart" role="status">
          {succes}
        </p>
      )}

      {rattachable && (
        <section className="tiroir-section" aria-labelledby="titre-rattachement">
          <h3 id="titre-rattachement">Ajouter ce livre au catalogue</h3>
          <p className="tiroir-note">
            Ce livre n’est pas encore vendu par la librairie. Une fois la demande rattachée à son
            article, elle sera mise de côté pour le client à la réception, comme pour un article
            épuisé.
          </p>

          {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

          {produitCree ? (
            <div className="tiroir-actions">
              <Button type="button" loading={envoi} onClick={() => rattacher(produitCree)}>
                Rattacher à « {produitCree.designation} »
              </Button>
            </div>
          ) : (
            <>
              <fieldset className="choix-radios">
                <legend className="visuellement-cache">Comment ajouter ce livre</legend>
                <label>
                  <input type="radio" name="choix" checked={choix === 'creer'} onChange={() => setChoix('creer')} />
                  Créer la fiche de l’article
                </label>
                <label>
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
                <form className="formulaire-tiroir" onSubmit={rattacherExistant} noValidate>
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
                  <div className="tiroir-actions">
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
    </>
  )
}

export default PanneauDemande
