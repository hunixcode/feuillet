import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import ClientLayout from '../layouts/ClientLayout.tsx'
import ResponsableLayout from '../layouts/ResponsableLayout.tsx'
import ErreurPage from '../pages/ErreurPage.tsx'
import NotFoundPage from '../pages/NotFoundPage.tsx'
import AccueilPage from '../pages/client/AccueilPage.tsx'
import CataloguePage from '../pages/client/CataloguePage.tsx'
import CommandePage from '../pages/client/CommandePage.tsx'
import ConnexionPage from '../pages/client/ConnexionPage.tsx'
import DemandesPage from '../pages/client/DemandesPage.tsx'
import InscriptionPage from '../pages/client/InscriptionPage.tsx'
import MesCommandesPage from '../pages/client/MesCommandesPage.tsx'
import PanierPage from '../pages/client/PanierPage.tsx'
import ProduitPage from '../pages/client/ProduitPage.tsx'
import CatalogueAdminPage from '../pages/responsable/CatalogueAdminPage.tsx'
import CommandesPage from '../pages/responsable/CommandesPage.tsx'
import DemandesAdminPage from '../pages/responsable/DemandesAdminPage.tsx'
import ParametresPage from '../pages/responsable/ParametresPage.tsx'
import RapportsPage from '../pages/responsable/RapportsPage.tsx'
import StockPage from '../pages/responsable/StockPage.tsx'
import TableauDeBordPage from '../pages/responsable/TableauDeBordPage.tsx'
import VentesPage from '../pages/responsable/VentesPage.tsx'
import ProtectedRoute from './ProtectedRoute.tsx'

const pages: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedRoute role="responsable" />,
    children: [
      {
        element: <ResponsableLayout />,
        children: [
          { index: true, element: <TableauDeBordPage /> },
          { path: 'catalogue', element: <CatalogueAdminPage /> },
          { path: 'stock', element: <StockPage /> },
          { path: 'ventes', element: <VentesPage /> },
          { path: 'demandes', element: <DemandesAdminPage /> },
          { path: 'commandes', element: <CommandesPage /> },
          { path: 'rapports', element: <RapportsPage /> },
          { path: 'parametres', element: <ParametresPage /> },
          {
            path: '*',
            element: <NotFoundPage retour={{ to: '/admin', label: 'Retour au tableau de bord' }} />,
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <ClientLayout />,
    children: [
      { index: true, element: <AccueilPage /> },
      { path: 'connexion', element: <ConnexionPage /> },
      { path: 'inscription', element: <InscriptionPage /> },
      { path: 'catalogue', element: <CataloguePage /> },
      { path: 'produits/:id', element: <ProduitPage /> },
      { path: 'panier', element: <PanierPage /> },
      {
        element: <ProtectedRoute role="client" />,
        children: [
          { path: 'demandes', element: <DemandesPage /> },
          { path: 'commandes', element: <MesCommandesPage /> },
          { path: 'commandes/:id', element: <CommandePage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const routes: RouteObject[] = [{ errorElement: <ErreurPage />, children: pages }]

export const router = createBrowserRouter(routes)
