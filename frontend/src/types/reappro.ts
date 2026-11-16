export interface Fournisseur {
  id: string
  nom: string
  contact?: string
}

export type StatutCommandeFournisseur = 'en_cours' | 'partiellement_recue' | 'recue'

export interface CommandeFournisseur {
  id: string
  fournisseur: Pick<Fournisseur, 'id' | 'nom'>
  produitId: string
  reference: string
  designation: string
  quantiteCommandee: number
  quantiteRecue: number
  date: string
  dateArriveePrevue: string
  statut: StatutCommandeFournisseur
  dateReceptionComplete?: string
}

export interface ProduitAReapprovisionner {
  produitId: string
  reference: string
  designation: string
  quantiteVendable: number
  quantiteAcheteeOrigine: number
  seuilAlerte: number
  pourcentageVendu: number
  quantiteEnCommande: number
}

export interface FicheFournisseur {
  nom: string
  contact?: string
}

export interface NouvelleCommandeFournisseur {
  fournisseurId: string
  produitId: string
  quantiteCommandee: number
  dateArriveePrevue: string
}

export interface Reception {
  id: string
  commandeId: string
  produitId: string
  date: string
  quantiteRecue: number
  quantiteAbimee: number
  validee: boolean
  dateValidation?: string
}

export interface SaisieReception {
  quantiteRecue: number
  quantiteAbimee: number
}

export interface ReceptionValidee {
  reception: Reception
  commande: CommandeFournisseur
}
