import { defineConfig, devices } from "@playwright/test";
import { PORT } from "./config.mjs";

const ci = Boolean(process.env.CI);

// Les tests partagent une seule application et sa base : ils tournent l'un après l'autre,
// chacun sur ses propres articles. Pas de nouvel essai : l'inscription est limitée à 5 comptes par heure.
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: ci,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Pacific/Tahiti",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Base neuve à chaque lancement : jamais de serveur déjà ouvert réutilisé.
  webServer: {
    command: "node serveur.mjs",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
