// backend/src/routes/capacitacion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/capacitacion.controller");
const {
  obtenerDetalleCumplimiento,
} = require("../controllers/capacitacion.controller");

// 🟢 Middleware de Autenticación
const { verificarToken } = require("../middlewares/auth.middleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- CONFIGURACIÓN MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/evidencias/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "evidencia-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- RUTAS ---

// 1. Crear (POST) - MODO UNIFICADO (Firma + Galería)
router.post(
  "/",
  verificarToken,
  (req, res, next) => {
    console.log("🚦 POST /capacitaciones - Iniciando carga unificada...");
    next();
  },
  // Aceptamos fotos de galería Y la firma del expositor
  upload.fields([
    { name: "evidencias", maxCount: 20 },
    { name: "expositor_firma", maxCount: 1 },
  ]),
  (req, res, next) => {
    // 🟢 LOG SEGURO: Usamos validación opcional para evitar el TypeError
    const evidencias =
      req.files && req.files["evidencias"] ? req.files["evidencias"].length : 0;
    const tieneFirma = req.files && req.files["expositor_firma"] ? "SÍ" : "NO";

    console.log(
      `🚦 Multer finalizado. Evidencias detectadas: ${evidencias}, Firma detectada: ${tieneFirma}`,
    );
    next();
  },
  controller.crearCapacitacion,
);

// 2. Listar todas
router.get("/", verificarToken, controller.obtenerCapacitaciones);

// 3. RUTAS ESPECÍFICAS
router.get("/exportar/excel", verificarToken, controller.exportarExcel);
router.get("/detalle/:id", verificarToken, obtenerDetalleCumplimiento);
router.post(
  "/registrar-asistencia/:id",
  verificarToken,
  controller.registrarAsistencia,
);

// 🟢 Eliminar una foto específica de la galería
router.delete(
  "/documento/:idDoc",
  verificarToken,
  controller.eliminarDocumento,
);

// 4. RUTAS DINÁMICAS
router.get("/:id", verificarToken, controller.obtenerCapacitacion);

// 5. Actualizar (PUT)
router.put(
  "/:id",
  verificarToken,
  // También permitimos actualizar firma o agregar fotos en el PUT
  upload.fields([
    { name: "evidencias", maxCount: 20 },
    { name: "expositor_firma", maxCount: 1 },
  ]),
  controller.actualizarCapacitacion,
);

// 6. Eliminar
router.delete("/:id", verificarToken, controller.eliminarCapacitacion);

module.exports = router;
