import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChoixQuantite from '../../components/client/ChoixQuantite.tsx'
import Couverture from '../../components/client/Couverture.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import { usePanier } from '../../contexts/usePanier'
import { ApiRequestError } from '../../services/api'
import { listerCategories } from '../../services/categorieService'
import { obtenirProduit } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'
import NotFoundPage from '../NotFoundPage.tsx'
import './ProduitPage.css'

function Achat({ produit }: { produit: Produit }) {
  const { ajouter } = usePanier()
  const [quantite, setQuantite] = useState(1)
  const [ajoute, setAjoute] = useState(false)
  const epuise = produit.disponibilite === 'epuise'

  return (
    <>
      {produit.disponibilite && (
        <p className={`etat ${epuise ? 'etat-manque' : 'etat-ok'}`}>
          {epuise ? 'Épuisé' : 'Disponible'}
        </p>
      )}
      {epuise ? (
        <>
          <div className="achat-ligne">
            <Button disabled>Ajouter au panier</Button>
            <Link
              className="common-button common-button--secondary"
              to={`/demandes?titre=${encodeURIComponent(produit.designation)}`}
            >
              Demander ce livre
            </Link>
          </div>
          <p className="aide">
            Cet article est épuisé. Demandez-le : nous vous prévenons dès son retour en rayon.
          </p>
        </>
      ) : (
        <>
          <div className="achat-ligne">
            <ChoixQuantite valeur={quantite} onChange={setQuantite} libelle="Quantité" />
            <Button
              onClick={() => {
                ajouter(produit.id, quantite)
                setAjoute(true)
              }}
            >
              Ajouter au panier
            </Button>
          </div>
          {ajoute && (
            <p className="aide" role="status">
              Ajouté au panier. <Link to="/panier">Voir le panier</Link>
            </p>
          )}
          <p className="aide">
            Le panier ne réserve pas l'article. Sa disponibilité est vérifiée quand vous confirmez
            votre commande.
          </p>
        </>
      )}
    </>
  )
}

interface Resultat {
  cle: string
  produit: Produit | null
  introuvable: boolean
  erreur: string
}

function ProduitPage() {
  const { id = '' } = useParams()
  const [categories, setCategories] = useState<Categorie[]>([])
  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<Resultat | null>(null)

  const cle = `${id}|${essai}`
  const chargement = resultat?.cle !== cle

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    obtenirProduit(id)
      .then((produit) => {
        if (actif) {
          setResultat({ cle, produit, introuvable: false, erreur: '' })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setResultat({
            cle,
            produit: null,
            introuvable: raison instanceof ApiRequestError && raison.code === 'INTROUVABLE',
            erreur: messageErreur(raison),
          })
        }
      })
    return () => {
      actif = false
    }
  }, [id, cle])

  if (chargement || !resultat) {
    return (
      <div className="fiche" aria-busy="true">
        <p className="visuellement-cache" role="status">
          Chargement de l'article…
        </p>
        <div className="fil">
          <div className="squelette squelette-fil" />
        </div>
        <div className="fiche-grille">
          <div className="fiche-visuel">
            <div className="squelette squelette-couverture" />
          </div>
          <div className="fiche-infos">
            <div className="squelette squelette-ligne squelette-courte" />
            <div className="squelette squelette-titre" />
            <div className="squelette squelette-prix" />
            <div className="squelette squelette-ligne" />
            <div className="squelette squelette-ligne squelette-courte" />
          </div>
        </div>
      </div>
    )
  }

  if (resultat.introuvable) {
    return <NotFoundPage />
  }

  const produit = resultat.produit
  if (!produit) {
    return (
      <section className="fiche-erreur">
        <h1>L'article n'a pas pu être chargé.</h1>
        <ErrorMessage>{resultat.erreur}</ErrorMessage>
        <div className="fiche-erreur-actions">
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
          <Link className="common-button common-button--secondary" to="/catalogue">
            Retour au catalogue
          </Link>
        </div>
      </section>
    )
  }

  const categorie = categories.find((rayon) => rayon.id === produit.categorie)?.libelle
  const sousTitre = produit.auteur ?? produit.marque ?? categorie

  return (
    <article className="fiche">
      <title>{`${produit.designation} · Feuillet`}</title>
      <nav className="fil" aria-label="Fil d'Ariane">
        <Link to="/catalogue">Catalogue</Link>
        {categorie && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/catalogue?categorie=${encodeURIComponent(produit.categorie)}`}>
              {categorie}
            </Link>
          </>
        )}
      </nav>

      <div className="fiche-grille">
        <div className="fiche-visuel">
          <Couverture produit={produit} />
        </div>

        <div className="fiche-infos">
          {sousTitre && <p className="fiche-auteur">{sousTitre}</p>}
          <h1>{produit.designation}</h1>

          <div className="fiche-achat">
            <p className="fiche-prix">
              <strong>{formatXPF(produit.prixApplique)}</strong>
              {produit.promotion && (
                <>
                  <s>
                    <span className="visuellement-cache">au lieu de </span>
                    {formatXPF(produit.prix)}
                  </s>
                  <span className="promo">−{produit.promotion.remise} %</span>
                </>
              )}
            </p>
            <p className="aide">
              {produit.promotion &&
                `Promotion valable jusqu'au ${formatDate(produit.promotion.fin)}. `}
              TVA de {produit.tauxTva} % incluse.
            </p>
            <Achat key={produit.id} produit={produit} />
          </div>

          <dl className="details">
            <dt>Référence</dt>
            <dd>{produit.reference}</dd>
            <dt>Catégorie</dt>
            <dd>{categorie ?? produit.categorie}</dd>
            {produit.type === 'livre' && produit.auteur && (
              <>
                <dt>Auteur</dt>
                <dd>{produit.auteur}</dd>
              </>
            )}
            {produit.type === 'livre' && produit.isbn && (
              <>
                <dt>ISBN</dt>
                <dd>{produit.isbn}</dd>
              </>
            )}
            {produit.type === 'magazine' && produit.issn && (
              <>
                <dt>ISSN</dt>
                <dd>{produit.issn}</dd>
              </>
            )}
            {produit.type === 'magazine' && produit.numero !== undefined && (
              <>
                <dt>Numéro</dt>
                <dd>{produit.numero}</dd>
              </>
            )}
            {produit.type === 'magazine' && produit.dateParution && (
              <>
                <dt>Parution</dt>
                <dd>{formatDate(produit.dateParution)}</dd>
              </>
            )}
            {produit.type === 'papeterie' && produit.marque && (
              <>
                <dt>Marque</dt>
                <dd>{produit.marque}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </article>
  )
}

export default ProduitPage
