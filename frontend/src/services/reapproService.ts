import type {
  CommandeFournisseur,
  FicheFournisseur,
  Fournisseur,
  NouvelleCommandeFournisseur,
  ProduitAReapprovisionner,
  Reception,
  ReceptionValidee,
  SaisieReception,
  SeuilAlerte,
  SeuilAlerteDuProduit,
  StatutCommandeFournisseur,
} from '../types/reappro'
import { get, post, put } from './api'

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

export function creerCommandeFournisseur(
  commande: NouvelleCommandeFournisseur,
): Promise<CommandeFournisseur> {
  return post<CommandeFournisseur>('/commandes-fournisseur', commande)
}

export function listerFournisseurs(): Promise<Fournisseur[]> {
  return get<Fournisseur[]>('/fournisseurs')
}

export function creerFournisseur(fiche: FicheFournisseur): Promise<Fournisseur> {
  return post<Fournisseur>('/fournisseurs', fiche)
}

export function modifierFournisseur(id: string, fiche: FicheFournisseur): Promise<Fournisseur> {
  return put<Fournisseur>(`/fournisseurs/${encodeURIComponent(id)}`, fiche)
}

export function listerReceptions(commandeId: string): Promise<Reception[]> {
  return get<Reception[]>(`/commandes-fournisseur/${encodeURIComponent(commandeId)}/receptions`)
}

export function enregistrerReception(
  commandeId: string,
  saisie: SaisieReception,
): Promise<Reception> {
  return post<Reception>(
    `/commandes-fournisseur/${encodeURIComponent(commandeId)}/receptions`,
    saisie,
  )
}

export function validerReception(receptionId: string): Promise<ReceptionValidee> {
  return post<ReceptionValidee>(`/receptions/${encodeURIComponent(receptionId)}/validation`, {})
}

export function listerSeuilsAlerte(): Promise<SeuilAlerteDuProduit[]> {
  return get<SeuilAlerteDuProduit[]>('/seuils-alerte')
}

export function lireSeuilAlerte(produitId: string): Promise<SeuilAlerte> {
  return get<SeuilAlerte>(`/produits/${produitId}/seuil-alerte`)
}

export function definirSeuilAlerte(produitId: string, seuilAlerte: number | null): Promise<SeuilAlerte> {
  return put<SeuilAlerte>(`/produits/${produitId}/seuil-alerte`, { seuilAlerte })
}
