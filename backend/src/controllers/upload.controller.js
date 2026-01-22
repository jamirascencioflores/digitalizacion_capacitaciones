// backend/src/controllers/upload.controller.js
const multer = require("multer");
const { uploadFromBuffer } = require("../utils/uploadToCloudinary");

// 1. CONFIGURACIÓN MULTER (CAMBIO CLAVE: Memoria, no Disco)
const storage = multer.memoryStorage();

// Filtro (Solo imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// 2. FUNCIÓN DE SUBIDA (Ahora sube a Cloudinary)
const subirArchivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    // 🟢 PASO 1: Recibir la carpeta desde el body o usar la default
    const carpetaDestino = req.body.folder || "uploads_generales";

    console.log(
      `📤 Subiendo imagen a Cloudinary en la carpeta: ${carpetaDestino}`,
    );

    // 🟢 PASO 2: Usar la variable en lugar del texto fijo
    const result = await uploadFromBuffer(req.file.buffer, carpetaDestino);

    console.log("✅ Imagen subida:", result.secure_url);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("❌ Error al subir archivo:", error);
    res.status(500).json({ error: "Error al subir la imagen" });
  }
};

module.exports = { upload, subirArchivo };
