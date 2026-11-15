import type { EtatRetours } from '../../types/retour'
import type { Vente } from '../../types/vente'

export function venteDeTest(valeurs: Partial<Vente> = {}): Vente {
  return {
    id: 'v-1',
    date: '2026-11-10T20:00:00.000Z',
    statut: 'expediee',
    dateExpedition: '2026-11-11T19:00:00.000Z',
    client: { id: 'c-1', nom: 'Léa Martin', email: 'lea@example.pf' },
    adresseLivraison: 'BP 12, Papeete',
    occasionCadeau: undefined,
    emballageCadeau: false,
    lignes: [
      {
        produitId: 'p-1',
        quantite: 2,
        reference: 'LIV-001',
        designation: "L'Île au trésor",
        prixUnitaire: 1530,
        remise: 15,
        tauxTva: 5,
        montant: 3060,
        montantTva: 146,
      },
      {
        produitId: 'p-2',
        quantite: 1,
        reference: 'PAP-001',
        designation: 'Carnet ligné A5',
        prixUnitaire: 950,
        remise: 0,
        tauxTva: 16,
        montant: 950,
        montantTva: 131,
      },
    ],
    sousTotal: 4010,
    fraisEmballage: 0,
    fraisLivraison: 800,
    frais: 800,
    montantTva: 277,
    total: 4810,
    ...valeurs,
  }
}

export function retoursDeTest(valeurs: Partial<EtatRetours> = {}): EtatRetours {
  return {
    venteId: 'v-1',
    dateLimiteRetour: '2026-11-25T09:59:59.999Z',
    retourPossible: true,
    lignes: [
      {
        produitId: 'p-1',
        reference: 'LIV-001',
        designation: "L'Île au trésor",
        quantite: 2,
        prixUnitaire: 1530,
        quantiteRetournee: 1,
        quantiteRetournable: 1,
      },
      {
        produitId: 'p-2',
        reference: 'PAP-001',
        designation: 'Carnet ligné A5',
        quantite: 1,
        prixUnitaire: 950,
        quantiteRetournee: 0,
        quantiteRetournable: 1,
      },
    ],
    retours: [
      {
        id: 'r-1',
        venteId: 'v-1',
        produitId: 'p-1',
        reference: 'LIV-001',
        designation: "L'Île au trésor",
        quantite: 1,
        date: '2026-11-12T20:00:00.000Z',
        issue: 'remboursement',
        revendable: true,
        valeur: 1530,
        montantRembourse: 1530,
        complementPaye: 0,
      },
    ],
    ...valeurs,
  }
}
