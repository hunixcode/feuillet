import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { RESPONSABLE } from "../config.mjs";

export const MOT_DE_PASSE = "MotDePasse-e2e-2026";

export function emailUnique(prefixe: string): string {
  return `${prefixe}-${Date.now()}-${Math.floor(Math.random() * 1000)}@e2e.test`;
}

export async function inscrire(page: Page, nom: string, email: string): Promise<void> {
  await page.goto("/inscription");
  await page.getByLabel("Nom complet").fill(nom);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { name: `Bienvenue, ${nom}` })).toBeVisible();
}

export async function connecterResponsable(page: Page): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(RESPONSABLE.email);
  await page.getByLabel("Mot de passe").fill(RESPONSABLE.motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function ajouterAuPanier(page: Page, designation: string, quantite = 1): Promise<void> {
  await page.goto("/catalogue");
  await page.getByRole("link", { name: new RegExp(designation) }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: designation })).toBeVisible();
  await page.getByRole("textbox", { name: "Quantité" }).fill(String(quantite));
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("Ajouté au panier.")).toBeVisible();
}

export async function tokenApi(request: APIRequestContext, email: string, motDePasse: string): Promise<string> {
  const reponse = await request.post("/api/auth/connexion", { data: { email, motDePasse } });
  expect(reponse.ok()).toBe(true);
  return ((await reponse.json()) as { token: string }).token;
}

export async function idProduit(request: APIRequestContext, designation: string): Promise<string> {
  const reponse = await request.get("/api/produits");
  expect(reponse.ok()).toBe(true);
  const produits = (await reponse.json()) as { id: string; designation: string }[];
  const produit = produits.find((p) => p.designation === designation);
  if (!produit) throw new Error(`Article « ${designation} » absent du seed`);
  return produit.id;
}
