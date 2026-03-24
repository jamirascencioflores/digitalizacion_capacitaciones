const admin = require("firebase-admin");
require("dotenv").config();

/**
 * CONFIGURACIÓN DE FIREBASE ADMIN SDK
 * Permite gestionar Storage saltándose las reglas de seguridad de cliente.
 */

try {
    // Intentamos cargar la cuenta de servicio si el archivo existe
    // Por seguridad, este archivo NO debe subirse a git.
    const serviceAccount = require("./serviceAccountKey.json");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log("🔥 Firebase Admin configurado con Service Account.");
} catch (error) {
    // Si no está el archivo, usamos modo básico orientado a variables de entorno (ideal para Hosting de Firebase)
    // O mostramos advertencia.
    admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.warn("⚠️ Firebase Admin configurado SIN serviceAccountKey.json. Podría fallar en local.");
}

const storage = admin.storage().bucket();

module.exports = { admin, storage };
