// backend/src/controllers/upload.controller.js
const multer = require("multer");
const path = require("path");

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Carpeta donde se guardan
  },
  filename: function (req, file, cb) {
    // Generamos nombre único: fecha + nombre original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Filtro (Solo imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Función que usa la ruta
const subirArchivo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se envió ningún archivo" });
  }

  // Construimos la URL para acceder al archivo
  // En producción, cambia 'localhost:4000' por tu dominio real
  const protocol = req.protocol;
  const host = req.get("host");
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.json({ url: fileUrl, filename: req.file.filename });
};

module.exports = { upload, subirArchivo };
