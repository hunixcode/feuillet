export interface EtatStock {
  produitId: string
  quantitePhysique: number
  quantiteMiseDeCote: number
  quantiteDefectueuse: number
  quantiteVendable: number
}

export interface LigneStock extends EtatStock {
  reference: string
  designation: string
}

export type TypeMouvement = 'entree' | 'vente' | 'retour' | 'remplacement' | 'ajustement'

export type Operateur = 'responsable' | 'client' | 'systeme'

export interface Mouvement {
  id: string
  produitId: string
  date: string
  type: TypeMouvement
  quantite: number
  motif: string
  operateur: Operateur
  quantiteAvant?: number
  quantiteApres?: number
}

export interface InventairePayload {
  quantiteComptee: number
  motif: string
}

export interface DefectueuxPayload {
  quantite: number
  motif: string
}
