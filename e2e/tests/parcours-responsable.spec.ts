import { expect, test } from "@playwright/test";
import { connecterResponsable, emailUnique, idProduit, MOT_DE_PASSE } from "./outils";

const ARTICLE = "Le Crime de l'Orient-Express";

test("le responsable expédie une commande et voit la sortie de stock dans le journal", async ({ page, request }) => {
  // Commande passée par l'API pour un client à part : seul l'espace responsable est parcouru ici.
  const email = emailUnique("expedition");
  const inscription = await request.post("/api/auth/inscription", {
    data: { nom: "Teva Expédition", email, motDePasse: MOT_DE_PASSE },
  });
  expect(inscription.status()).toBe(201);
  const { token } = (await inscription.json()) as { token: string };
  const commande = await request.post("/api/commandes", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      lignes: [{ produitId: await idProduit(request, ARTICLE), quantite: 2 }],
      adresseLivraison: "BP 42, 98713 Papeete",
      paiementDemo: "accepte",
    },
  });
  expect(commande.status()).toBe(201);

  await connecterResponsable(page);
  await page.getByRole("link", { name: "Ventes" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Ventes et retours" })).toBeVisible();

  const ligne = page.getByRole("row").filter({ hasText: email });
  await expect(ligne).toContainText("À préparer");
  await ligne.getByRole("button").click();

  const detail = page.getByRole("complementary", { name: "Commande choisie" });
  await expect(detail.getByRole("heading", { name: "Teva Expédition" })).toBeVisible();
  await expect(detail.getByRole("row").filter({ hasText: ARTICLE })).toBeVisible();
  await detail.getByRole("button", { name: "Marquer comme expédiée" }).click();
  await expect(detail.getByRole("status")).toContainText("marquée comme expédiée");
  await expect(detail.getByText(/^Expédiée le/)).toBeVisible();
  await detail.getByRole("button", { name: "Fermer la commande" }).click();
  await expect(page.getByRole("row").filter({ hasText: email })).toHaveCount(0);

  await page.getByRole("link", { name: "Stock" }).first().click();
  const journal = page.getByRole("region", { name: "Journal des mouvements" });
  await journal.getByRole("combobox", { name: "Article" }).selectOption({ label: ARTICLE });
  await journal.getByRole("combobox", { name: "Type de mouvement" }).selectOption({ label: "Vente" });
  const sortie = journal.getByRole("row").filter({ hasText: ARTICLE }).first();
  await expect(sortie).toContainText("−2");
  await expect(sortie).toContainText("Vente en ligne");

  // 5 exemplaires dans le seed, 2 vendus : il en reste 3 en rayon.
  const stock = page.getByRole("region", { name: "Stock par article" }).getByRole("row").filter({ hasText: ARTICLE });
  await expect(stock.getByRole("cell").nth(1)).toHaveText("3");
});
