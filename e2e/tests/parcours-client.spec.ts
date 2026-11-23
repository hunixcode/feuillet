import { expect, test } from "@playwright/test";
import { ajouterAuPanier, emailUnique, inscrire, remplirLivraison } from "./outils";

test("un client s'inscrit, commande un livre et retrouve sa commande", async ({ page }) => {
  await inscrire(page, "Hinano Client", emailUnique("client"));

  await page.getByRole("link", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();

  await ajouterAuPanier(page, "Le Petit Prince", 2);
  await page.getByRole("link", { name: "Voir le panier" }).click();

  await expect(page.getByRole("textbox", { name: "Quantité de Le Petit Prince" })).toHaveValue("2");
  const recapitulatif = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(recapitulatif.getByText("2 400 XPF")).toBeVisible();
  await expect(page.getByLabel("Nom complet")).toHaveValue("Hinano Client");
  await remplirLivraison(page, "12 rue des Remparts", "98713", "Papeete");

  // Un paiement refusé n'enregistre rien et garde le panier.
  await page.getByRole("button", { name: "Simuler un refus" }).click();
  await expect(page.getByRole("alert")).toContainText("Paiement refusé");
  await expect(page.getByRole("textbox", { name: "Quantité de Le Petit Prince" })).toHaveValue("2");

  await page.getByRole("button", { name: "Payer (démo)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Commande confirmée" })).toBeVisible();
  await expect(page.getByText("À préparer")).toBeVisible();
  const livraison = page.getByRole("region", { name: "Livraison" });
  await expect(livraison.getByText("Tél. 87 12 34 56")).toBeVisible();
  await expect(livraison.getByText("12 rue des Remparts")).toBeVisible();
  await expect(livraison.getByText("98713 Papeete")).toBeVisible();

  await page.getByRole("link", { name: "Voir toutes mes commandes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mes commandes" })).toBeVisible();
  const commandes = page.getByRole("main").getByRole("listitem");
  await expect(commandes).toHaveCount(1);
  await expect(commandes.first()).toContainText("2 articles");
  await expect(commandes.first()).toContainText("À préparer");

  await page.getByRole("link", { name: "Panier" }).click();
  await expect(page.getByRole("textbox", { name: /^Quantité de/ })).toHaveCount(0);
});
