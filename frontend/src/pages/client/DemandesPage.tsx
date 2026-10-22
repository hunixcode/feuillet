import Button from '../../components/common/Button.tsx'
import Input from '../../components/common/Input.tsx'
import './DemandesPage.css'

function DemandesPage() {
  return (
    <div className="demandes">
      <title>Mes demandes · Feuillet</title>
      <div className="page-intro">
        <h1>Mes demandes</h1>
        <p>Les livres que vous attendez</p>
      </div>

      <div className="demandes-grille">
        <section className="vide" aria-labelledby="suivi-titre">
          <h2 id="suivi-titre">Aucune demande à afficher pour l'instant.</h2>
          <p>
            Le suivi de vos demandes sera bientôt disponible. Vous y verrez chaque livre demandé,
            la quantité, la date et le statut : en attente, mis de côté, honorée, expirée ou
            annulée.
          </p>
        </section>

        <form
          className="encadre formulaire"
          onSubmit={(evenement) => evenement.preventDefault()}
          noValidate
        >
          <h2>Demander un livre</h2>
          <p className="aide">
            Pour un livre absent du catalogue. Une demande ne vous engage pas à l'acheter.
          </p>
          <Input label="Titre" name="titre" placeholder="Ex. Le Rivage des Syrtes" />
          <Input label="Auteur (facultatif)" name="auteur" />
          <Input label="ISBN (facultatif)" name="isbn" />
          <Input label="Quantité" name="quantite" type="number" min={1} defaultValue={1} />
          <Button type="submit" disabled aria-describedby="demande-bientot">
            Envoyer la demande
          </Button>
          <p className="aide" id="demande-bientot">
            L'envoi des demandes sera bientôt disponible.
          </p>
        </form>
      </div>
    </div>
  )
}

export default DemandesPage
