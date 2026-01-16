// backend/src/controllers/upload.controller.js
const multer = require("multer");
const { uploadImage } = require("../utils/cloudinary"); // Importamos tu utilidad

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

    console.log("📤 Pre-cargando imagen a Cloudinary...");

    // Usamos tu utilidad para subir el buffer a Cloudinary
    const result = await uploadImage(req.file.buffer, "uploads_generales");

    console.log("✅ Imagen lista:", result.secure_url);

    // Devolvemos la URL de Cloudinary para que el Frontend la use
    res.json({
      url: result.secure_url,
      filename: result.public_id,
    });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    res.status(500).json({ error: "Error al subir la imagen" });
  }
};

module.exports = { upload, subirArchivo };
