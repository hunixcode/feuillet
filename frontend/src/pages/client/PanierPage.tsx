import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Champ from '../../components/client/Champ.tsx'
import LignePanier from '../../components/client/LignePanier.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import { useAuth } from '../../contexts/useAuth'
import { usePanier } from '../../contexts/usePanier'
import {
  calculerDevis,
  lignesRefusees,
  paiementRefuse,
  passerCommande,
} from '../../services/commandeService'
import { obtenirProduits } from '../../services/produitService'
import type { Produit } from '../../types/produit'
import type {
  CommandePayload,
  Devis,
  LigneCommande,
  OccasionCadeau,
  PaiementDemo,
} from '../../types/vente'
import { erreursDesChamps, messageErreur, stockModifie } from '../../utils/erreurs'
import { formatXPF } from '../../utils/format'
import {
  composerAdresse,
  LIVRAISON_VIDE,
  LONGUEURS_LIVRAISON,
  ORDRE_LIVRAISON,
  verifierLivraison,
  type ChampLivraison,
  type DetailsLivraison,
} from '../../utils/livraison'

const LIGNES_REFUSEES =
  "Rien n'a été enregistré : certains articles ne sont plus disponibles dans la quantité demandée. Corrigez votre panier puis payez à nouveau."
const STOCK_CHANGE =
  "Le stock a changé pendant votre commande. Rien n'a été enregistré : vérifiez votre panier et payez à nouveau."
const PAIEMENT_REFUSE =
  "Paiement refusé (démonstration) : la commande n'a pas été enregistrée. Votre panier est intact, vous pouvez payer à nouveau."

const OCCASIONS = [
  { valeur: 'noel', libelle: 'Noël' },
  { valeur: 'anniversaire', libelle: 'Anniversaire' },
  { valeur: 'fete', libelle: 'Fête' },
]

const CHAMPS_LIVRAISON: {
  champ: ChampLivraison
  label: string
  autoComplete: string
  placeholder?: string
  aide?: string
  large?: boolean
  type?: string
  inputMode?: 'numeric' | 'tel'
}[] = [
  { champ: 'nom', label: 'Nom complet', autoComplete: 'name', placeholder: 'Prénom et nom' },
  { champ: 'telephone', label: 'Téléphone', autoComplete: 'tel', placeholder: 'Pour le livreur', type: 'tel', inputMode: 'tel' },
  {
    champ: 'adresse',
    label: 'Adresse',
    autoComplete: 'street-address',
    placeholder: 'Numéro et rue, BP ou lot',
    aide: 'Livraison à domicile uniquement.',
    large: true,
  },
  { champ: 'codePostal', label: 'Code postal', autoComplete: 'postal-code', placeholder: '98714', inputMode: 'numeric' },
  { champ: 'ville', label: 'Ville', autoComplete: 'address-level2', placeholder: 'Ville ou commune' },
  { champ: 'indications', label: 'Indications', autoComplete: 'off', placeholder: 'Facultatif : portail, étage, repère…', large: true },
]

function PanierPage() {
  const { utilisateur, chargement: sessionEnCours } = useAuth()
  const { lignes, nombreArticles, changerQuantite, retirer, vider } = usePanier()
  const navigate = useNavigate()

  const [produits, setProduits] = useState<Record<string, Produit | null>>({})
  const [erreur, setErreur] = useState<{ cle: string; message: string } | null>(null)
  const [essai, setEssai] = useState(0)
  const [cadeau, setCadeau] = useState(false)
  const [occasion, setOccasion] = useState('')
  const [emballage, setEmballage] = useState(false)
  const [livraison, setLivraison] = useState<DetailsLivraison>(LIVRAISON_VIDE)
  const [nomModifie, setNomModifie] = useState(false)
  const [devis, setDevis] = useState<{ cle: string; valeur: Devis } | null>(null)
  const [erreurDevis, setErreurDevis] = useState<{ cle: string; message: string } | null>(null)
  const [essaiDevis, setEssaiDevis] = useState(0)
  const [envoi, setEnvoi] = useState<PaiementDemo | null>(null)
  const [refus, setRefus] = useState<{ message: string; lignes: LigneCommande[] } | null>(null)
  const [erreursLivraison, setErreursLivraison] = useState<Partial<Record<ChampLivraison, string>>>({})

  const details: DetailsLivraison = {
    ...livraison,
    nom: nomModifie ? livraison.nom : (utilisateur?.nom ?? ''),
  }

  function changerLivraison(champ: ChampLivraison, valeur: string) {
    if (champ === 'nom') {
      setNomModifie(true)
    }
    setLivraison((actuelle) => ({ ...actuelle, [champ]: valeur }))
    setErreursLivraison(({ [champ]: _corrige, ...autres }) => autres)
  }

  const manquants = lignes
    .map((ligne) => ligne.produitId)
    .filter((id) => !(id in produits))
    .join(',')
  const cle = `${manquants}|${essai}`
  const enErreur = erreur?.cle === cle
  const chargement = manquants !== '' && !enErreur

  const occasionCadeau = cadeau && occasion ? (occasion as OccasionCadeau) : undefined
  const panier: CommandePayload = {
    lignes,
    emballageCadeau: emballage,
    ...(occasionCadeau ? { occasionCadeau } : {}),
  }
  const requeteDevis = JSON.stringify(panier)
  const cleDevis = `${requeteDevis}|${essaiDevis}`
  const devisAJour = devis?.cle === cleDevis ? devis.valeur : null
  const devisEnErreur = erreurDevis?.cle === cleDevis
  const calculEnCours = lignes.length > 0 && !devisAJour && !devisEnErreur

  useEffect(() => {
    if (manquants === '') {
      return
    }
    let actif = true
    obtenirProduits(manquants.split(','))
      .then((trouves) => {
        if (actif) {
          setProduits((actuels) => ({ ...actuels, ...trouves }))
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setErreur({ cle, message: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [manquants, cle])

  useEffect(() => {
    const demande: CommandePayload = JSON.parse(requeteDevis)
    if (demande.lignes.length === 0) {
      return
    }
    let actif = true
    calculerDevis(demande)
      .then((valeur) => {
        if (actif) {
          setDevis({ cle: cleDevis, valeur })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setErreurDevis({ cle: cleDevis, message: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [requeteDevis, cleDevis])

  const indisponibles = new Set(
    [...(devisAJour?.lignesIndisponibles ?? []), ...(refus?.lignes ?? [])].map(
      (ligne) => ligne.produitId,
    ),
  )

  const aDesProblemes =
    indisponibles.size > 0 || lignes.some((ligne) => produits[ligne.produitId] === null)

  function modifierQuantite(produitId: string, quantite: number) {
    setRefus(null)
    changerQuantite(produitId, quantite)
  }

  function retirerLigne(produitId: string) {
    setRefus(null)
    retirer(produitId)
  }

  async function payer(paiementDemo: PaiementDemo) {
    setRefus(null)
    const erreurs = verifierLivraison(details)
    setErreursLivraison(erreurs)
    const premier = ORDRE_LIVRAISON.find((champ) => erreurs[champ])
    if (premier) {
      document.getElementById(`livraison-${premier}`)?.focus()
      return
    }
    setEnvoi(paiementDemo)
    try {
      const vente = await passerCommande({
        ...panier,
        adresseLivraison: composerAdresse(details),
        paiementDemo,
      })
      vider()
      navigate(`/commandes/${vente.id}`, { state: { confirmee: true } })
    } catch (raison) {
      const refusees = lignesRefusees(raison)
      const champs = erreursDesChamps(raison)
      if (refusees.length > 0) {
        setRefus({ message: LIGNES_REFUSEES, lignes: refusees })
        setEssaiDevis((actuel) => actuel + 1)
      } else if (stockModifie(raison)) {
        setRefus({ message: STOCK_CHANGE, lignes: [] })
        setEssaiDevis((actuel) => actuel + 1)
      } else if (champs.adresseLivraison) {
        setErreursLivraison({ adresse: champs.adresseLivraison })
      } else if (paiementRefuse(raison)) {
        setRefus({ message: PAIEMENT_REFUSE, lignes: [] })
      } else {
        setRefus({ message: messageErreur(raison), lignes: [] })
      }
    } finally {
      setEnvoi(null)
    }
  }

  function montant(choix: (valeur: Devis) => number) {
    const valeur = devisAJour ?? devis?.valeur
    return valeur ? formatXPF(choix(valeur)) : 'Calcul…'
  }

  function action() {
    if (sessionEnCours) {
      return null
    }
    if (!utilisateur) {
      return (
        <Link className="bouton bouton-blanc" to="/connexion" state={{ depuis: '/panier' }}>
          Se connecter pour commander
        </Link>
      )
    }
    if (utilisateur.role !== 'client') {
      return <p className="recap-note">Connectez-vous avec un compte client pour commander.</p>
    }
    const bloque = aDesProblemes || !devisAJour || envoi !== null
    return (
      <section className="paiement" aria-labelledby="titre-paiement">
        <h3 id="titre-paiement">Paiement (démonstration)</h3>
        <p className="paiement-fictif">Paiement fictif : aucun montant n'est débité.</p>
        <p className="recap-note">Aucune carte n'est demandée. Le paiement confirme la commande.</p>
        <Button onClick={() => payer('accepte')} loading={envoi === 'accepte'} disabled={bloque}>
          Payer (démo)
        </Button>
        <Button
          variant="secondary"
          onClick={() => payer('refuse')}
          loading={envoi === 'refuse'}
          disabled={bloque}
        >
          Simuler un refus
        </Button>
      </section>
    )
  }

  function contenu() {
    if (lignes.length === 0) {
      return (
        <section className="page-corps vide">
          <h2>Votre panier est vide.</h2>
          <p>
            Ajoutez des livres depuis le catalogue. Le panier ne réserve rien : les quantités sont
            vérifiées quand vous confirmez votre commande.
          </p>
          <Link className="bouton" to="/catalogue">
            Parcourir le catalogue
          </Link>
        </section>
      )
    }

    if (chargement) {
      return (
        <div className="page-corps">
          <Loader>Chargement du panier…</Loader>
        </div>
      )
    }

    if (enErreur) {
      return (
        <div className="page-corps vide">
          <ErrorMessage>{erreur?.message ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    const valeur = devisAJour ?? devis?.valeur

    return (
      <div className="panier">
        <div>
          <ul className="lignes">
            {lignes.map((ligne) => (
              <LignePanier
                key={ligne.produitId}
                produit={produits[ligne.produitId] ?? null}
                quantite={ligne.quantite}
                montant={valeur?.lignes.find((l) => l.produitId === ligne.produitId)?.montant}
                indisponible={indisponibles.has(ligne.produitId)}
                onQuantite={(quantite) => modifierQuantite(ligne.produitId, quantite)}
                onRetirer={() => retirerLigne(ligne.produitId)}
              />
            ))}
          </ul>

          <form
            className="options"
            aria-labelledby="titre-options"
            onSubmit={(evenement) => evenement.preventDefault()}
            noValidate
          >
            <h2 className="titre-bloc" id="titre-options">
              Options
            </h2>
            <div className="option">
              <label className="option-texte" htmlFor="option-cadeau">
                <strong>C'est un cadeau</strong>
                <span>Pour une occasion, le délai de retour passe à un mois.</span>
              </label>
              <input
                className="interrupteur"
                type="checkbox"
                id="option-cadeau"
                checked={cadeau}
                onChange={(evenement) => {
                  setCadeau(evenement.target.checked)
                  if (!evenement.target.checked) {
                    setOccasion('')
                  }
                }}
              />
            </div>
            <div className={cadeau ? 'occasions ouvert' : 'occasions'}>
              <div>
                {cadeau && (
                  <ul className="pilules" aria-label="Occasion">
                    {OCCASIONS.map((choix) => (
                      <li key={choix.valeur}>
                        <button
                          type="button"
                          aria-pressed={occasion === choix.valeur}
                          onClick={() => setOccasion(occasion === choix.valeur ? '' : choix.valeur)}
                        >
                          {choix.libelle}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="option">
              <label className="option-texte" htmlFor="option-emballage">
                <strong>Emballage cadeau</strong>
                <span>Les frais s'affichent dans le récapitulatif.</span>
              </label>
              <input
                className="interrupteur"
                type="checkbox"
                id="option-emballage"
                checked={emballage}
                onChange={(evenement) => setEmballage(evenement.target.checked)}
              />
            </div>

            <h2 className="titre-bloc titre-livraison">Livraison</h2>
            <div className="adresse">
              {CHAMPS_LIVRAISON.map((description) => (
                <Champ
                  key={description.champ}
                  id={`livraison-${description.champ}`}
                  name={description.champ}
                  label={description.label}
                  large={description.large}
                  type={description.type}
                  inputMode={description.inputMode}
                  autoComplete={description.autoComplete}
                  placeholder={description.placeholder}
                  aide={description.aide}
                  maxLength={LONGUEURS_LIVRAISON[description.champ]}
                  value={details[description.champ]}
                  error={erreursLivraison[description.champ]}
                  onChange={(evenement) => changerLivraison(description.champ, evenement.target.value)}
                />
              ))}
            </div>
          </form>
        </div>

        <aside className="recap" aria-labelledby="titre-recap">
          <h2 id="titre-recap">Récapitulatif</h2>
          {devisEnErreur ? (
            <div className="recap-erreur">
              <ErrorMessage>{erreurDevis?.message ?? ''}</ErrorMessage>
              <Button variant="secondary" onClick={() => setEssaiDevis(essaiDevis + 1)}>
                Recalculer
              </Button>
            </div>
          ) : (
            <>
              <dl aria-busy={calculEnCours || undefined}>
                <div>
                  <dt>{`Articles (${nombreArticles})`}</dt>
                  <dd>{montant((d) => d.sousTotal)}</dd>
                </div>
                <div>
                  <dt>Emballage cadeau</dt>
                  <dd>{emballage ? montant((d) => d.fraisEmballage) : 'Aucun'}</dd>
                </div>
                <div>
                  <dt>Livraison à domicile</dt>
                  <dd>{montant((d) => d.fraisLivraison)}</dd>
                </div>
              </dl>
              <div className="recap-total">
                <span>Total TTC</span>
                <strong>{montant((d) => d.total)}</strong>
              </div>
              <p className="recap-tva">
                <span>dont TVA</span> <span>{montant((d) => d.montantTva)}</span>
              </p>
            </>
          )}
          {action()}
          {refus && <ErrorMessage className="recap-refus">{refus.message}</ErrorMessage>}
          {aDesProblemes && !refus && (
            <p className="recap-note">Corrigez les articles signalés pour pouvoir commander.</p>
          )}
          <p className="recap-note">
            Le panier ne réserve pas les articles : leur disponibilité est vérifiée quand vous
            confirmez la commande.
          </p>
        </aside>
      </div>
    )
  }

  return (
    <>
      <title>Panier · Feuillet</title>
      <header className="page-tete">
        <h1 className="page-titre">Panier</h1>
        <p className="page-intro">
          <span>{nombreArticles > 1 ? `${nombreArticles} articles` : `${nombreArticles} article`}</span>
          {lignes.length > 0 && '. La disponibilité est vérifiée au moment où vous confirmez la commande.'}
        </p>
      </header>
      {contenu()}
    </>
  )
}

export default PanierPage
