import type { ReactNode } from 'react'

const ICONES: Record<string, ReactNode> = {
  tableau: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/>
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.6"/>
      <rect x="13.5" y="11" width="7" height="9.5" rx="1.6"/>
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>
    </>
  ),
  ventes: (
    <>
      <path d="M3.5 7.5 12 3.2l8.5 4.3v9L12 20.8l-8.5-4.3z"/>
      <path d="M3.5 7.5 12 11.8l8.5-4.3M12 11.8v9"/>
    </>
  ),
  demandes: (
    <>
      <path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>
    </>
  ),
  catalogue: (
    <>
      <path d="M3.5 5.6c2.9-1.4 5.7-1.4 8.5 0v14c-2.8-1.4-5.6-1.4-8.5 0zM12 5.6c2.8-1.4 5.6-1.4 8.5 0v14c-2.9-1.4-5.7-1.4-8.5 0"/>
    </>
  ),
  stock: (
    <>
      <rect x="3.5" y="12.5" width="8" height="8" rx="1.2"/>
      <rect x="12.5" y="12.5" width="8" height="8" rx="1.2"/>
      <rect x="8" y="3.5" width="8" height="8" rx="1.2"/>
    </>
  ),
  commandes: (
    <>
      <path d="M2.5 6.5h11v10.2h-11zM13.5 9.8h4.2l3 3.2v3.7h-7.2"/>
      <circle cx="6.5" cy="17.6" r="1.9"/>
      <circle cx="16.8" cy="17.6" r="1.9"/>
    </>
  ),
  rapports: (
    <>
      <path d="M3.5 20.5h17M7 16.5v-5M12 16.5v-10M17 16.5v-7"/>
    </>
  ),
  parametres: (
    <>
      <path d="M4 7h9M18 7h2M4 17h3M12 17h8"/>
      <circle cx="15.5" cy="7" r="2.3"/>
      <circle cx="9.5" cy="17" r="2.3"/>
    </>
  ),
  livre: (
    <>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/>
      <path d="M5 17a3 3 0 0 1 3-3h10"/>
    </>
  ),
  carnet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2"/>
      <path d="M9 3v18M12 8h4M12 12h4"/>
    </>
  ),
  magazine: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </>
  ),
  loupe: (
    <>
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-3.6-3.6"/>
    </>
  ),
  coche: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7.5"/>
    </>
  ),
  chevron: (
    <>
      <path d="m9.5 6 6 6-6 6"/>
    </>
  ),
  gauche: (
    <>
      <path d="m14.5 6-6 6 6 6"/>
    </>
  ),
  droite: (
    <>
      <path d="m9.5 6 6 6-6 6"/>
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14"/>
    </>
  ),
  cadeau: (
    <>
      <rect x="4" y="9" width="16" height="11.5" rx="1.5"/>
      <path d="M3 9h18M12 9v11.5M12 9C10.5 5.5 7 5.3 7 7.4 7 9 10 9 12 9Zm0 0c1.5-3.5 5-3.7 5-1.6C17 9 14 9 12 9Z"/>
    </>
  ),
  camion: (
    <>
      <path d="M2.5 6.5h11v10.2h-11zM13.5 9.8h4.2l3 3.2v3.7h-7.2"/>
      <circle cx="6.5" cy="17.6" r="1.9"/>
      <circle cx="16.8" cy="17.6" r="1.9"/>
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 7.5V12l3 2"/>
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 11v5.5M12 7.8v.2"/>
    </>
  ),
  telecharger: (
    <>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>
    </>
  ),
  boutique: (
    <>
      <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5c0 1.7 1.3 2.8 2.7 2.8S9.3 11.2 9.3 9.5c0 1.7 1.2 2.8 2.7 2.8s2.7-1.1 2.7-2.8c0 1.7 1.2 2.8 2.6 2.8S20 11.2 20 9.5M5.5 12v8.5h13V12"/>
    </>
  ),
  soleil: (
    <>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>
    </>
  ),
  lune: (
    <>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>
    </>
  ),
  auto: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2"/>
      <path d="M8.5 20h7M12 16.5V20"/>
    </>
  ),
  hausse: (
    <>
      <path d="M12 19V5m0 0-5.5 5.5M12 5l5.5 5.5"/>
    </>
  ),
  baisse: (
    <>
      <path d="M12 5v14m0 0-5.5-5.5M12 19l5.5-5.5"/>
    </>
  ),
  fleche: (
    <>
      <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"/>
    </>
  ),
  horsligne: (
    <>
      <path d="M7.5 18.5h9.5a4 4 0 0 0 1-7.9 6 6 0 0 0-11.2-1.7A4.8 4.8 0 0 0 7.5 18.5Z"/>
      <path d="m3.5 3.5 17 17"/>
    </>
  ),
  apercu: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    </>
  ),
}

export default function IconeAdmin({ nom, epaisseur = 1.6 }: { nom: string; epaisseur?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONES[nom]}
    </svg>
  )
}
