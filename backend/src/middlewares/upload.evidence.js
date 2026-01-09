// backend/src/middlewares/upload.evidence.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Guardar en carpeta específica 'uploads/evidencias'
const uploadDir = path.join(process.cwd(), "uploads/evidencias");

// Crear la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configuración de almacenamiento (NOMBRES ÚNICOS)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único: evidencia-TIMESTAMP-RANDOM.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "evidencia-" + uniqueSuffix + ext);
  },
});

// 3. Filtro (Solo imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Solo se permiten archivos de imagen (jpg, png, jpeg)"),
      false
    );
  }
};

const uploadEvidence = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB (las fotos de celular pesan)
});

module.exports = uploadEvidence;
