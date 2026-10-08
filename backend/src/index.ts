import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { connectDb } from "./db/connection.js";

async function main(): Promise<void> {
  const env = loadEnv();

  await connectDb(env.mongoUri);
  console.log(`MongoDB connecté → ${env.mongoUri}`);

  createApp().listen(env.port, () => {
    console.log(`API → http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Démarrage impossible :", err);
  process.exit(1);
});
