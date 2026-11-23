import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Segment from '../../components/client/Segment.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import { LIBELLES_OCCASION } from '../../components/responsable/libelles'
import RetoursVente from '../../components/responsable/RetoursVente.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { lireParametres } from '../../services/parametreService'
import { listerProduits } from '../../services/produitService'
import { expedierVente, listerVentes, obtenirVente } from '../../services/venteAdminService'
import type { Parametres } from '../../types/parametres'
import type { Produit } from '../../types/produit'
import type { StatutVente, Vente } from '../../types/vente'
import {
  ajouterJours,
  dateCourte,
  dateLongue,
  dateRelative,
  ecartJours,
  heure,
  jourDe,
  majuscule,
  nomJour,
} from '../../utils/datesAdmin'
import { codeErreur, messageErreur, messageErreurRetour } from '../../utils/erreurs'
import { useOuverture } from '../../utils/ouvertureAdmin'
import { formatXPF, jourIso } from '../../utils/format'
import { lignesAdresse } from '../../utils/livraison'
import './VentesPage.css'

type Filtre = StatutVente | 'tous'

function articles(vente: Vente): number {
  return vente.lignes.reduce((somme, ligne) => somme + ligne.quantite, 0)
}

function pluriel(valeur: number, mot: string): string {
  return `${valeur} ${mot}${valeur > 1 ? 's' : ''}`
}

function limiteRetour(vente: Vente, parametres: Parametres | null): string | null {
  if (!parametres) {
    return null
  }
  const delai = vente.occasionCadeau ? parametres.delaiRetourCadeauJours : parametres.delaiRetourJours
  return ajouterJours(jourDe(vente.date), delai)
}

function Statut({ vente }: { vente: Vente }) {
  return vente.statut === 'a_preparer' ? (
    <span className="statut statut-preparer">À préparer</span>
  ) : (
    <span className="statut statut-expediee">Expédiée</span>
  )
}

function VentesPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [filtre, setFiltre] = useState<Filtre>('a_preparer')
  const [recherche, setRecherche] = useState('')
  const [ventes, setVentes] = useState<Vente[] | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [parametres, setParametres] = useState<Parametres | null>(null)
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState<Vente | null>(null)
  const [expedieeIci, setExpedieeIci] = useState(false)
  const [expedition, setExpedition] = useState(false)
  const [erreurExpedition, setErreurExpedition] = useState('')
  const [message, setMessage] = useState('')
  const [annonce, setAnnonce] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [version, setVersion] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const [aOuvrir, setAOuvrir] = useState<string | null>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useOuverture(['vente'], (ouverture) => setAOuvrir(ouverture.id ?? null))

  if (aOuvrir && ventes) {
    const trouvee = ventes.find((element) => element.id === aOuvrir)
    setAOuvrir(null)
    if (trouvee) {
      setFiltre(trouvee.statut)
      ouvrir(trouvee)
    }
  }

  useEffect(() => {
    let actif = true
    listerProduits()
      .then((liste) => actif && setProduits(liste))
      .catch(() => {})
    lireParametres()
      .then((valeurs) => actif && setParametres(valeurs))
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    listerVentes('')
      .then((liste) => {
        if (actif) {
          setVentes(liste)
          setErreur('')
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [version])

  const idChoisi = choisie?.id
  useEffect(() => {
    if (!idChoisi) {
      return
    }
    refFermer.current?.focus({ preventScroll: true })
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        fermer()
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [idChoisi])

  useEffect(() => {
    if (!annonce) {
      return
    }
    const minuterie = window.setTimeout(() => setAnnonce(''), 4200)
    return () => window.clearTimeout(minuterie)
  }, [annonce])

  const produitDe = (id: string) => produits.find((produit) => produit.id === id)

  function ouvrir(vente: Vente) {
    setChoisie(vente)
    setExpedieeIci(false)
    setErreurExpedition('')
    setMessage('')
  }

  function fermer() {
    setChoisie(null)
    setErreurExpedition('')
    setMessage('')
  }

  function clavierLigne(evenement: KeyboardEvent<HTMLTableRowElement>, vente: Vente) {
    if (evenement.target === evenement.currentTarget && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      ouvrir(vente)
    }
  }

  function cocher(id: string, coche: boolean) {
    setSelection((actuelle) => (coche ? [...actuelle, id] : actuelle.filter((element) => element !== id)))
  }

  async function expedier(vente: Vente) {
    setExpedition(true)
    setErreurExpedition('')
    setMessage('')
    try {
      const aJour = await expedierVente(vente.id)
      setChoisie(aJour)
      setExpedieeIci(true)
      setMessage(`La commande de ${aJour.client.nom} est marquée comme expédiée.`)
    } catch (probleme) {
      setErreurExpedition(messageErreurRetour(probleme))
      if (codeErreur(probleme) === 'COMMANDE_DEJA_EXPEDIEE') {
        obtenirVente(vente.id)
          .then(setChoisie)
          .catch(() => {})
      }
    } finally {
      setExpedition(false)
      rafraichir()
    }
  }

  async function expedierSelection() {
    const ids = [...selection]
    let reussies = 0
    for (const id of ids) {
      try {
        await expedierVente(id)
        reussies += 1
      } catch {
        continue
      }
    }
    setSelection([])
    setAnnonce(reussies > 1 ? `${reussies} commandes expédiées` : reussies === 1 ? '1 commande expédiée' : 'Aucune commande expédiée')
    rafraichir()
  }

  const toutes = ventes ?? []
  const aPreparer = toutes.filter((vente) => vente.statut === 'a_preparer')
  const texte = recherche.trim().toLowerCase()
  const visibles = toutes.filter(
    (vente) =>
      (filtre === 'tous' || vente.statut === filtre) &&
      (!texte ||
        vente.client.nom.toLowerCase().includes(texte) ||
        vente.client.email.toLowerCase().includes(texte)),
  )
  const cochables = visibles.filter((vente) => vente.statut === 'a_preparer')
  const toutCoche = cochables.length > 0 && cochables.every((vente) => selection.includes(vente.id))
  const vente = choisie

  return (
    <>
      <title>Ventes et retours · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Ventes et retours</h1>
          <p>Préparez les colis, marquez-les expédiés, puis enregistrez les retours reçus.</p>
        </div>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="feuille" aria-label="Commandes">
        <div className="outils">
          <Segment
            libelle="Statut des commandes"
            valeur={filtre}
            onChange={(valeur) => setFiltre(valeur as Filtre)}
            options={[
              { valeur: 'a_preparer', libelle: 'À préparer', compte: aPreparer.length },
              { valeur: 'expediee', libelle: 'Expédiées', compte: toutes.length - aPreparer.length },
              { valeur: 'tous', libelle: 'Toutes', compte: toutes.length },
            ]}
          />
          <label className="cherche">
            <IconeAdmin nom="loupe" epaisseur={1.8} />
            <input
              type="search"
              placeholder="Rechercher un client"
              aria-label="Rechercher un client"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
          </label>
          <p className="outils-droite">
            {aPreparer.length
              ? `${aPreparer.reduce((somme, element) => somme + articles(element), 0)} articles à emballer`
              : 'Tout est expédié'}
          </p>
        </div>

        {!ventes && !erreur && <Loader />}

        {ventes && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col" className="case">
                  <input
                    type="checkbox"
                    aria-label="Sélectionner toutes les commandes à préparer"
                    checked={toutCoche}
                    disabled={cochables.length === 0}
                    onChange={(evenement) =>
                      setSelection(evenement.target.checked ? cochables.map((element) => element.id) : [])
                    }
                  />
                </th>
                <th scope="col">Client</th>
                <th scope="col" className="optionnel">
                  Articles
                </th>
                <th scope="col" className="optionnel">
                  Passée
                </th>
                <th scope="col" className="num">
                  Total TTC
                </th>
                <th scope="col">Statut</th>
                <th scope="col" className="num optionnel-large">
                  <span hidden>Suite</span>
                </th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((element) => {
                const nombre = articles(element)
                const lignesVisibles = element.lignes.slice(0, element.lignes.length > 3 ? 2 : 3)
                const limite = limiteRetour(element, parametres)
                return (
                  <tr
                    key={element.id}
                    tabIndex={0}
                    className={selection.includes(element.id) ? 'selectionnee' : undefined}
                    onClick={() => ouvrir(element)}
                    onKeyDown={(evenement) => clavierLigne(evenement, element)}
                  >
                    <td className="case" onClick={(evenement) => evenement.stopPropagation()}>
                      {element.statut === 'a_preparer' && (
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner la commande de ${element.client.nom}`}
                          checked={selection.includes(element.id)}
                          onChange={(evenement) => cocher(element.id, evenement.target.checked)}
                        />
                      )}
                    </td>
                    <td>
                      <span className="article-titre">{element.client.nom}</span>
                      <span className="article-meta">{element.client.email}</span>
                    </td>
                    <td className="optionnel">
                      <span className="article">
                        <span className="pile">
                          {lignesVisibles.map((ligne) => {
                            const fiche = produitDe(ligne.produitId)
                            return <Vignette key={ligne.produitId} isbn={fiche?.isbn} type={fiche?.type} />
                          })}
                          {element.lignes.length > lignesVisibles.length && (
                            <span className="pile-plus">{`+${element.lignes.length - lignesVisibles.length}`}</span>
                          )}
                        </span>
                        <span className="article-meta">
                          {`${pluriel(nombre, 'article')}${element.emballageCadeau ? ', emballage cadeau' : ''}`}
                        </span>
                      </span>
                    </td>
                    <td className="optionnel">
                      <span className="article-titre" style={{ fontWeight: 500 }}>
                        {majuscule(dateRelative(jourDe(element.date), aujourdhui))}
                      </span>
                      <span className="article-meta">{heure(element.date)}</span>
                    </td>
                    <td className="num fort">{formatXPF(element.total)}</td>
                    <td>
                      <Statut vente={element} />
                    </td>
                    <td className="num optionnel-large">
                      {element.statut === 'a_preparer' ? (
                        <button
                          className="bouton bouton-petit bouton-contour"
                          type="button"
                          onClick={(evenement) => {
                            evenement.stopPropagation()
                            ouvrir(element)
                          }}
                        >
                          Marquer expédiée
                        </button>
                      ) : limite && ecartJours(aujourdhui, limite) >= 0 ? (
                        <span className="gris">{`Retour jusqu’au ${dateCourte(limite)}`}</span>
                      ) : (
                        <span className="gris">Délai de retour passé</span>
                      )}
                    </td>
                    <td className="chevron">
                      <IconeAdmin nom="chevron" epaisseur={2} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {ventes && visibles.length === 0 && (
          <p className="vide-liste">
            {filtre === 'a_preparer' && !texte
              ? 'Aucune commande à préparer : tout est parti.'
              : 'Aucune commande ne correspond.'}
          </p>
        )}
      </section>

      <div
        className={selection.length > 0 ? 'selection visible' : 'selection'}
        role="region"
        aria-label="Commandes sélectionnées"
        hidden={selection.length === 0}
      >
        <span>{`${pluriel(selection.length, 'commande')} sélectionnée${selection.length > 1 ? 's' : ''}`}</span>
        <button className="action-ligne" type="button" onClick={() => setSelection([])}>
          Désélectionner
        </button>
        <button className="bouton bouton-petit" type="button" onClick={expedierSelection}>
          Marquer expédiées
        </button>
      </div>

      <div className={annonce ? 'message-admin visible' : 'message-admin'} role="status" aria-live="polite">
        <IconeAdmin nom="coche" epaisseur={3} />
        <span>{annonce}</span>
      </div>

      {vente && (
        <>
          <div className="tiroir-fond ouvert" aria-hidden="true" onClick={fermer} />
          <aside className="tiroir ouvert" aria-label="Commande choisie">
            <div className="tiroir-barre">
              <span>{`Commande du ${dateLongue(jourDe(vente.date))}, ${heure(vente.date)}`}</span>
              <button
                ref={refFermer}
                className="bouton-fermer"
                type="button"
                aria-label="Fermer la commande"
                onClick={fermer}
              >
                Fermer
              </button>
            </div>
            <h2 className="tiroir-titre" style={{ marginTop: 4 }}>
              {vente.client.nom}
            </h2>
            <p className="tiroir-meta">{vente.client.email}</p>
            <div className="etiquettes" style={{ marginTop: 14 }}>
              <Statut vente={vente} />
              {vente.occasionCadeau && (
                <span className="etiquette">
                  <IconeAdmin nom="cadeau" epaisseur={1.7} />
                  {`Cadeau, ${LIBELLES_OCCASION[vente.occasionCadeau].toLowerCase()}`}
                </span>
              )}
            </div>
            {erreurExpedition && <ErrorMessage>{erreurExpedition}</ErrorMessage>}
            {message && (
              <p className="encart" role="status">
                <IconeAdmin nom="coche" epaisseur={2.4} />
                <span>{message}</span>
              </p>
            )}

            <section className="tiroir-section" aria-labelledby="titre-livraison-vente">
              <h3 id="titre-livraison-vente">Livraison</h3>
              {vente.adresseLivraison ? (
                <address className="adresse-livraison">
                  {lignesAdresse(vente.adresseLivraison).map((ligne, index) => (
                    <span key={`${index}-${ligne}`}>{ligne}</span>
                  ))}
                </address>
              ) : (
                <p className="tiroir-note">Adresse non renseignée.</p>
              )}
            </section>

            <section className="tiroir-section">
              <h3>Suivi</h3>
              <ol className="chronologie">
                <li>
                  <strong>Commande passée</strong>
                  <time>{`${majuscule(nomJour(jourDe(vente.date)))} ${dateLongue(jourDe(vente.date))}, ${heure(vente.date)}`}</time>
                </li>
                <li>
                  <strong>Paiement de démonstration accepté</strong>
                  <time>Aucun montant débité</time>
                </li>
                {vente.statut === 'expediee' && vente.dateExpedition ? (
                  <li>
                    <strong>Colis expédié</strong>
                    <time>{`${majuscule(nomJour(jourDe(vente.dateExpedition)))} ${dateLongue(jourDe(vente.dateExpedition))}`}</time>
                  </li>
                ) : (
                  <li className="a-venir">
                    <strong>Colis à préparer</strong>
                    <time>En attente d’expédition</time>
                  </li>
                )}
                {vente.statut === 'expediee' && limiteRetour(vente, parametres) && (
                  <li className="a-venir">
                    <strong>
                      {ecartJours(aujourdhui, limiteRetour(vente, parametres) ?? aujourdhui) >= 0
                        ? 'Fin du délai de retour'
                        : 'Délai de retour terminé'}
                    </strong>
                    <time>{dateLongue(limiteRetour(vente, parametres) ?? aujourdhui)}</time>
                  </li>
                )}
              </ol>
            </section>

            <section className="tiroir-section">
              <h3>
                Articles<small>{pluriel(articles(vente), 'article')}</small>
              </h3>
              <table className="lignes-commande">
                <tbody>
                  {vente.lignes.map((ligne) => {
                    const fiche = produitDe(ligne.produitId)
                    return (
                      <tr key={ligne.produitId}>
                        <td>
                          <Vignette isbn={fiche?.isbn} type={fiche?.type} />
                        </td>
                        <td>
                          <p className="rangee-titre">{ligne.designation}</p>
                          <p className="rangee-meta">
                            {`${ligne.quantite} × ${formatXPF(ligne.prixUnitaire)}${ligne.remise > 0 ? `, remise de ${ligne.remise} %` : ''}, TVA ${ligne.tauxTva} %`}
                          </p>
                        </td>
                        <td className="num">{formatXPF(ligne.montant)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <dl className="montants">
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
                  <dd>{vente.fraisLivraison > 0 ? formatXPF(vente.fraisLivraison) : 'Offerte'}</dd>
                </div>
                <div className="total">
                  <dt>Total TTC</dt>
                  <dd>{formatXPF(vente.total)}</dd>
                </div>
                <div>
                  <dt>dont TVA</dt>
                  <dd>{formatXPF(vente.montantTva)}</dd>
                </div>
              </dl>
              {vente.statut === 'a_preparer' ? (
                <div className="tiroir-actions">
                  <button
                    className="bouton"
                    type="button"
                    disabled={expedition}
                    aria-busy={expedition || undefined}
                    onClick={() => expedier(vente)}
                  >
                    <IconeAdmin nom="camion" epaisseur={1.7} />
                    Marquer comme expédiée
                  </button>
                </div>
              ) : (
                vente.dateExpedition && (
                  <p className="tiroir-note">{`Expédiée le ${dateLongue(jourDe(vente.dateExpedition))}.`}</p>
                )
              )}
            </section>

            <section className="tiroir-section">
              <h3>Retour</h3>
              {vente.statut === 'a_preparer' ? (
                <p className="tiroir-note">Un retour pourra être enregistré une fois le colis expédié.</p>
              ) : expedieeIci ? (
                <p className="tiroir-note">
                  Le colis vient de partir : les retours reçus s’enregistrent en rouvrant la commande.
                </p>
              ) : (
                <RetoursVente
                  key={`${vente.id}-${vente.statut}`}
                  vente={vente}
                  produits={produits}
                  onChangement={rafraichir}
                />
              )}
            </section>
          </aside>
        </>
      )}
    </>
  )
}

export default VentesPage
