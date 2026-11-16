import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LignePanier from '../../components/client/LignePanier.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
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
import './PanierPage.css'

const LIGNES_REFUSEES =
  "Rien n'a été enregistré : certains articles ne sont plus disponibles dans la quantité demandée. Corrigez votre panier puis payez à nouveau."
const STOCK_CHANGE =
  "Le stock a changé pendant votre commande. Rien n'a été enregistré : vérifiez votre panier et payez à nouveau."
const PAIEMENT_REFUSE =
  "Paiement refusé (démonstration) : la commande n'a pas été enregistrée. Votre panier est intact, vous pouvez payer à nouveau."

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
  const [adresse, setAdresse] = useState('')
  const [devis, setDevis] = useState<{ cle: string; valeur: Devis } | null>(null)
  const [erreurDevis, setErreurDevis] = useState<{ cle: string; message: string } | null>(null)
  const [essaiDevis, setEssaiDevis] = useState(0)
  const [envoi, setEnvoi] = useState<PaiementDemo | null>(null)
  const [refus, setRefus] = useState<{ message: string; lignes: LigneCommande[] } | null>(null)
  const [erreurAdresse, setErreurAdresse] = useState('')

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
    setErreurAdresse('')
    setEnvoi(paiementDemo)
    try {
      const vente = await passerCommande({
        ...panier,
        adresseLivraison: adresse.trim(),
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
        setErreurAdresse(champs.adresseLivraison)
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
        <Link
          className="common-button common-button--primary"
          to="/connexion"
          state={{ depuis: '/panier' }}
        >
          Se connecter pour commander
        </Link>
      )
    }
    if (utilisateur.role !== 'client') {
      return <p className="aide">Connectez-vous avec un compte client pour commander.</p>
    }
    const bloque = aDesProblemes || !devisAJour || envoi !== null
    return (
      <section className="paiement" aria-labelledby="titre-paiement">
        <h3 id="titre-paiement">Paiement (démonstration)</h3>
        <p className="paiement-fictif">Paiement fictif : aucun montant n'est débité.</p>
        <p className="aide">Aucune carte n'est demandée. Le paiement confirme la commande.</p>
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
        <section className="vide">
          <h2>Votre panier est vide.</h2>
          <p>
            Ajoutez des livres depuis le catalogue. Le panier ne réserve rien : les quantités sont
            vérifiées quand vous confirmez votre commande.
          </p>
          <Link className="common-button common-button--primary" to="/catalogue">
            Parcourir le catalogue
          </Link>
        </section>
      )
    }

    if (chargement) {
      return <Loader>Chargement du panier…</Loader>
    }

    if (enErreur) {
      return (
        <div className="panier-erreur">
          <ErrorMessage>{erreur?.message ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    const valeur = devisAJour ?? devis?.valeur

    return (
      <div className="panier-grille">
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

          <form className="options" onSubmit={(evenement) => evenement.preventDefault()} noValidate>
            <fieldset>
              <legend>Cadeau</legend>
              <label className="choix">
                <input
                  type="checkbox"
                  checked={cadeau}
                  onChange={(evenement) => setCadeau(evenement.target.checked)}
                />
                <span>
                  C'est un cadeau
                  <small>Pour une occasion, le délai de retour passe à un mois.</small>
                </span>
              </label>
              {cadeau && (
                <Select
                  label="Occasion"
                  value={occasion}
                  onChange={(evenement) => setOccasion(evenement.target.value)}
                >
                  <option value="">Choisir une occasion</option>
                  <option value="noel">Noël</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="fete">Fête</option>
                </Select>
              )}
              <label className="choix">
                <input
                  type="checkbox"
                  checked={emballage}
                  onChange={(evenement) => setEmballage(evenement.target.checked)}
                />
                <span>
                  Emballage cadeau
                  <small>Les frais s'affichent dans le récapitulatif.</small>
                </span>
              </label>
            </fieldset>

            <fieldset>
              <legend>Livraison</legend>
              <Input
                label="Adresse de livraison"
                name="adresse"
                autoComplete="street-address"
                value={adresse}
                error={erreurAdresse}
                onChange={(evenement) => {
                  setAdresse(evenement.target.value)
                  setErreurAdresse('')
                }}
              />
              <p className="aide">Livraison à domicile uniquement.</p>
            </fieldset>
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
            <dl aria-busy={calculEnCours || undefined}>
              <dt>{`Articles (${nombreArticles})`}</dt>
              <dd>{montant((d) => d.sousTotal)}</dd>
              <dt>Emballage cadeau</dt>
              <dd>{emballage ? montant((d) => d.fraisEmballage) : 'Aucun'}</dd>
              <dt>Livraison à domicile</dt>
              <dd>{montant((d) => d.fraisLivraison)}</dd>
              <dt className="total">Total TTC</dt>
              <dd className="total">{montant((d) => d.total)}</dd>
              <dt>dont TVA</dt>
              <dd>{montant((d) => d.montantTva)}</dd>
            </dl>
          )}
          {action()}
          {refus && <ErrorMessage className="recap-refus">{refus.message}</ErrorMessage>}
          {aDesProblemes && !refus && (
            <p className="aide">Corrigez les articles signalés pour pouvoir commander.</p>
          )}
          <p className="aide">
            Le panier ne réserve pas les articles : leur disponibilité est vérifiée quand vous
            confirmez la commande.
          </p>
        </aside>
      </div>
    )
  }

  return (
    <div className="panier">
      <title>Panier · Feuillet</title>
      <div className="page-intro">
        <h1>Panier</h1>
        <p>{nombreArticles > 1 ? `${nombreArticles} articles` : `${nombreArticles} article`}</p>
      </div>
      {contenu()}
    </div>
  )
}

export default PanierPage
