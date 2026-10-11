import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'
import ClientLayout from '../layouts/ClientLayout.tsx'
import NotFoundPage from '../pages/NotFoundPage.tsx'
import CataloguePage from '../pages/client/CataloguePage.tsx'
import ConnexionPage from '../pages/client/ConnexionPage.tsx'
import DemandesPage from '../pages/client/DemandesPage.tsx'
import InscriptionPage from '../pages/client/InscriptionPage.tsx'
import PanierPage from '../pages/client/PanierPage.tsx'
import ProduitPage from '../pages/client/ProduitPage.tsx'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ClientLayout />,
    children: [
      { index: true, element: <Navigate to="/catalogue" replace /> },
      { path: 'catalogue', element: <CataloguePage /> },
      { path: 'produits/:id', element: <ProduitPage /> },
      { path: 'panier', element: <PanierPage /> },
      { path: 'demandes', element: <DemandesPage /> },
      { path: 'connexion', element: <ConnexionPage /> },
      { path: 'inscription', element: <InscriptionPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
