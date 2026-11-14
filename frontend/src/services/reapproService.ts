import type {
  CommandeFournisseur,
  ProduitAReapprovisionner,
  StatutCommandeFournisseur,
} from '../types/reappro'
import { get } from './api'

export interface FiltresCommandesFournisseur {
  statut?: StatutCommandeFournisseur | ''
  produitId?: string
  fournisseurId?: string
}

export function listerProduitsAReapprovisionner(): Promise<ProduitAReapprovisionner[]> {
  return get<ProduitAReapprovisionner[]>('/reapprovisionnement')
}

export function listerCommandesFournisseur(
  filtres: FiltresCommandesFournisseur = {},
): Promise<CommandeFournisseur[]> {
  const parametres = new URLSearchParams()
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur) {
      parametres.set(cle, valeur)
    }
  }
  const requete = parametres.toString()
  return get<CommandeFournisseur[]>(
    requete ? `/commandes-fournisseur?${requete}` : '/commandes-fournisseur',
  )
}
