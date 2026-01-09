// backend/src/middlewares/upload.middleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 1. Asegurar que la carpeta 'uploads' exista en la raíz del proyecto
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Guardar en la carpeta uploads
  },
  filename: function (req, file, cb) {
    // Usamos Buffer para corregir nombres con tildes o caracteres raros
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, originalName);
  },
});

// 3. Filtro modificado: Aceptar Imágenes Y Excel
const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");

  // Mimetypes comunes de Excel (.xls, .xlsx)
  const isExcel =
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel";

  if (isImage || isExcel) {
    cb(null, true);
  } else {
    cb(
      new Error("Solo se permiten imágenes o archivos Excel (.xls, .xlsx)"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Aumenté a 10MB por si el Excel es grande
});

module.exports = upload;
