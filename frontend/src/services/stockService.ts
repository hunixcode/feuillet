import type {
  DefectueuxPayload,
  EtatStock,
  InventairePayload,
  LigneStock,
  Mouvement,
  TypeMouvement,
} from '../types/stock'
import { get, post } from './api'
import { cheminAvecFiltres, type FiltresCatalogue } from './catalogueAdminService'

export interface FiltresMouvements {
  produit?: string
  type?: TypeMouvement | ''
}

export function listerStock(filtres: FiltresCatalogue = {}): Promise<LigneStock[]> {
  return get<LigneStock[]>(cheminAvecFiltres('/stock', filtres))
}

export function listerMouvements(filtres: FiltresMouvements = {}): Promise<Mouvement[]> {
  const parametres = new URLSearchParams()
  if (filtres.produit) {
    parametres.set('produit', filtres.produit)
  }
  if (filtres.type) {
    parametres.set('type', filtres.type)
  }
  const requete = parametres.toString()
  return get<Mouvement[]>(requete ? `/mouvements?${requete}` : '/mouvements')
}

export function corrigerInventaire(id: string, inventaire: InventairePayload): Promise<EtatStock> {
  return post<EtatStock>(`/produits/${encodeURIComponent(id)}/stock/inventaire`, inventaire)
}

export function declarerDefectueux(id: string, declaration: DefectueuxPayload): Promise<EtatStock> {
  return post<EtatStock>(`/produits/${encodeURIComponent(id)}/stock/defectueux`, declaration)
}

export function sortirDefectueux(id: string, sortie: DefectueuxPayload): Promise<EtatStock> {
  return post<EtatStock>(`/produits/${encodeURIComponent(id)}/stock/defectueux/sortie`, sortie)
}
