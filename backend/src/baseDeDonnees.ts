import mongoose from "mongoose";

const CONNECTEE = 1;
const DELAI_PING_MS = 2000;

export async function verifierMongo(delaiMs = DELAI_PING_MS): Promise<boolean> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== CONNECTEE || !db) {
    return false;
  }

  let minuteur: NodeJS.Timeout | undefined;
  const delaiDepasse = new Promise<false>((resolve) => {
    minuteur = setTimeout(() => resolve(false), delaiMs);
  });
  const ping = db
    .admin()
    .ping()
    .then(() => true)
    .catch(() => false);

  try {
    return await Promise.race([ping, delaiDepasse]);
  } finally {
    clearTimeout(minuteur);
  }
}
