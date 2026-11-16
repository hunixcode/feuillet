import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { PanierProvider } from './contexts/PanierContext.tsx'
import { router } from './routes/router.tsx'

function App() {
  return (
    <AuthProvider>
      <PanierProvider>
        <RouterProvider router={router} />
      </PanierProvider>
    </AuthProvider>
  )
}

export default App
