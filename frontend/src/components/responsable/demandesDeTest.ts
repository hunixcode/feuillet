import type { Demande } from '../../types/demande'

export function demandeDeTest(valeurs: Partial<Demande> = {}): Demande {
  return {
    id: 'd-1',
    client: { id: 'c-1', nom: 'Marie Teriitahi', email: 'marie@example.pf' },
    produitId: 'p-1',
    titre: 'L’Île au trésor',
    auteur: 'R. L. Stevenson',
    quantiteSouhaitee: 2,
    date: '2026-11-08T20:00:00.000Z',
    statut: 'en_attente',
    ...valeurs,
  }
}

export function demandeHorsCatalogue(valeurs: Partial<Demande> = {}): Demande {
  return demandeDeTest({
    id: 'd-2',
    produitId: undefined,
    titre: 'Le Rouge et le Noir',
    auteur: 'Stendhal',
    isbn: '978-2-07-041311-0',
    quantiteSouhaitee: 1,
    ...valeurs,
  })
}

export function demandeMiseDeCote(valeurs: Partial<Demande> = {}): Demande {
  return demandeDeTest({
    id: 'd-3',
    titre: 'Sakamoto Days, tome 2',
    auteur: undefined,
    statut: 'mise_de_cote',
    miseDeCote: { quantite: 1, dateLimite: '2026-11-16T09:59:59.999Z' },
    ...valeurs,
  })
}
