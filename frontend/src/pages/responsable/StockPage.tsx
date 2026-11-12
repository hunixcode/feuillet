import { useCallback, useEffect, useState } from 'react'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import FormulaireDefectueux from '../../components/responsable/FormulaireDefectueux.tsx'
import FormulaireInventaire from '../../components/responsable/FormulaireInventaire.tsx'
import JournalMouvements from '../../components/responsable/JournalMouvements.tsx'
import TableauStock from '../../components/responsable/TableauStock.tsx'
import { LIBELLES_TYPE } from '../../components/responsable/libelles'
import { listerCategories } from '../../services/categorieService'
import { listerMouvements, listerStock, type FiltresMouvements } from '../../services/stockService'
import type { Categorie } from '../../types/categorie'
import type { TypeProduit } from '../../types/produit'
import type { LigneStock, Mouvement } from '../../types/stock'
import { messageErreur } from '../../utils/erreurs'
import './StockPage.css'

type FiltreEtat = 'tous' | 'epuises' | 'defectueux'

function StockPage() {
  const [recherche, setRecherche] = useState('')
  const [type, setType] = useState<TypeProduit | ''>('')
  const [categorie, setCategorie] = useState('')
  const [filtreEtat, setFiltreEtat] = useState<FiltreEtat>('tous')
  const [lignes, setLignes] = useState<LigneStock[] | null>(null)
  const [articles, setArticles] = useState<LigneStock[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[] | null>(null)
  const [filtresJournal, setFiltresJournal] = useState<FiltresMouvements>({})
  const [selection, setSelection] = useState('')
  const [erreur, setErreur] = useState('')
  const [version, setVersion] = useState(0)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
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
  }, [])

  useEffect(() => {
    let actif = true
    listerStock({ q: recherche, type, categorie })
      .then((liste) => {
        if (actif) {
          setLignes(liste)
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
  }, [recherche, type, categorie, version])

  useEffect(() => {
    let actif = true
    listerStock()
      .then((liste) => {
        if (actif) {
          setArticles(liste)
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

  useEffect(() => {
    let actif = true
    listerMouvements(filtresJournal)
      .then((liste) => {
        if (actif) {
          setMouvements(liste)
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
  }, [filtresJournal, version])

  const lignesAffichees = lignes?.filter((ligne) => {
    if (filtreEtat === 'epuises') {
      return ligne.quantiteVendable === 0
    }
    if (filtreEtat === 'defectueux') {
      return ligne.quantiteDefectueuse > 0
    }
    return true
  })

  const ligneChoisie = articles.find((article) => article.produitId === selection)

  function choisir(ligne: LigneStock) {
    setSelection(ligne.produitId)
    setFiltresJournal((precedents) => ({ ...precedents, produit: ligne.produitId }))
  }

  return (
    <div className="stock-page">
      <title>Stock et mouvements · Feuillet</title>
      <header className="stock-entete">
        <h1>Stock et mouvements</h1>
        <p>
          Le stock vendable est le stock en rayon moins les exemplaires mis de côté. Les articles
          défectueux sont comptés à part et ne sont jamais vendables.
        </p>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="stock-surface" aria-label="Stock par article">
        <div className="stock-filtres">
          <Input
            label="Rechercher"
            type="search"
            placeholder="Titre ou référence"
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
          />
          <Select
            label="Type"
            value={type}
            onChange={(evenement) => setType(evenement.target.value as TypeProduit | '')}
          >
            <option value="">Tous les types</option>
            {Object.entries(LIBELLES_TYPE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </Select>
          <Select
            label="Catégorie"
            value={categorie}
            onChange={(evenement) => setCategorie(evenement.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((element) => (
              <option key={element.id} value={element.id}>
                {element.libelle}
              </option>
            ))}
          </Select>
          <Select
            label="État"
            value={filtreEtat}
            onChange={(evenement) => setFiltreEtat(evenement.target.value as FiltreEtat)}
          >
            <option value="tous">Tous les articles</option>
            <option value="epuises">Épuisés</option>
            <option value="defectueux">Avec des défectueux</option>
          </Select>
        </div>

        {lignesAffichees === undefined && !erreur && <Loader />}
        {lignesAffichees?.length === 0 && (
          <p className="stock-vide">Aucun article ne correspond.</p>
        )}
        {lignesAffichees && lignesAffichees.length > 0 && (
          <TableauStock lignes={lignesAffichees} selection={selection} onSelection={choisir} />
        )}
      </section>

      <div className="stock-grille">
        <section className="stock-surface" aria-labelledby="titre-journal">
          <h2 id="titre-journal">Journal des mouvements</h2>
          {mouvements === null && !erreur && <Loader />}
          {mouvements && (
            <JournalMouvements
              mouvements={mouvements}
              articles={articles}
              filtres={filtresJournal}
              onFiltres={setFiltresJournal}
            />
          )}
        </section>

        <aside className="stock-surface stock-panneau" aria-labelledby="titre-article">
          {ligneChoisie ? (
            <>
              <h2 id="titre-article">{ligneChoisie.designation}</h2>
              <FormulaireInventaire
                key={`inventaire-${ligneChoisie.produitId}`}
                ligne={ligneChoisie}
                onChangement={rafraichir}
                onRecharger={rafraichir}
              />
              <FormulaireDefectueux
                key={`defectueux-${ligneChoisie.produitId}`}
                ligne={ligneChoisie}
                onChangement={rafraichir}
                onRecharger={rafraichir}
              />
            </>
          ) : (
            <>
              <h2 id="titre-article">Actions sur le stock</h2>
              <p className="stock-aide">
                Choisissez un article dans le tableau pour corriger son inventaire ou gérer ses
                exemplaires défectueux.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default StockPage
