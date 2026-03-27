const admin = require("firebase-admin");
require("dotenv").config();

try {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Limpiamos la llave por si se colaron comillas extra en el .env
  if (privateKey) {
    privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log("🔥 Firebase Admin configurado con variables de entorno (.env).");
} catch (error) {
  console.error("❌ Error configurando Firebase Admin:", error.message);
}

const storage = admin.storage().bucket();
module.exports = { admin, storage };
