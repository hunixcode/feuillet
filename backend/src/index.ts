import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI manquante — copier .env.example vers .env");
  process.exit(1);
}

await mongoose.connect(mongoUri);
console.log("MongoDB connecté");

createApp().listen(port, () => {
  console.log(`API → http://localhost:${port}`);
});
