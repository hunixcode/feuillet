import { expect, test } from "@playwright/test";
import { RESPONSABLE } from "../config.mjs";
import { ajouterAuPanier, emailUnique, idProduit, inscrire, remplirLivraison, tokenApi } from "./outils";

const ARTICLE = "Calculatrice collège";

test("un article épuisé au moment de payer : rien n'est enregistré et la ligne est signalée", async ({
  page,
  request,
}) => {
  await inscrire(page, "Moana Épuisé", emailUnique("epuise"));
  await ajouterAuPanier(page, ARTICLE, 2);
  await page.goto("/panier");
  await remplirLivraison(page, "Lot 3", "98714", "Pirae");
  const recapitulatif = page.getByRole("complementary", { name: "Récapitulatif" });
  await expect(recapitulatif.getByRole("button", { name: "Payer (démo)" })).toBeEnabled();

  // Pendant que le client est sur son panier, l'inventaire du responsable ne trouve plus aucun exemplaire.
  const token = await tokenApi(request, RESPONSABLE.email, RESPONSABLE.motDePasse);
  const inventaire = await request.post(`/api/produits/${await idProduit(request, ARTICLE)}/stock/inventaire`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { quantiteComptee: 0, motif: "Test e2e : rayon vide" },
  });
  expect(inventaire.ok()).toBe(true);

  await recapitulatif.getByRole("button", { name: "Payer (démo)" }).click();
  await expect(page.getByRole("alert")).toContainText("Rien n'a été enregistré");
  await expect(page).toHaveURL(/\/panier$/);
  const ligne = page.getByRole("listitem").filter({ hasText: ARTICLE });
  await expect(ligne).toContainText(/est épuisé|n'est plus disponible/);
  await expect(page.getByRole("textbox", { name: `Quantité de ${ARTICLE}` })).toHaveValue("2");

  await page.mouse.wheel(0, -5000);
  await expect(page.getByRole("link", { name: "Mes commandes" })).toBeInViewport();
  await page.getByRole("link", { name: "Mes commandes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mes commandes" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /^Commande du/ })).toHaveCount(0);
});
