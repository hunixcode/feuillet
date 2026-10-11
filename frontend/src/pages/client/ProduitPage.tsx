import { useParams } from 'react-router-dom'

function ProduitPage() {
  const { id } = useParams()

  return <h1>Produit {id}</h1>
}

export default ProduitPage
