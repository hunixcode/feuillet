const xpfFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatXPF(montant: number): string {
  if (typeof montant !== 'number') {
    throw new TypeError('Le montant XPF doit être un nombre entier.')
  }

  if (!Number.isSafeInteger(montant)) {
    throw new RangeError('Le montant XPF doit être un entier sûr.')
  }

  const formatted = xpfFormatter.format(montant).replace(/[\u00a0\u202f]/g, ' ')
  return `${formatted} XPF`
}

export function formatDate(iso: string): string {
  const jourSeul = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    ...(jourSeul ? { timeZone: 'UTC' } : {}),
  }).format(new Date(iso))
}

const dateHeureFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Pacific/Tahiti',
})

export function formatDateHeure(iso: string): string {
  return dateHeureFormatter.format(new Date(iso))
}
