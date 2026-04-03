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
const storage = multer.memoryStorage(); // 🟢 Queda completamente vacío para usar la RAM

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- RUTAS ---

// 1. Crear (POST) - MODO UNIFICADO (Firma + Galería + Firmas Participantes)
router.post(
  "/",
  verificarToken,
  (req, res, next) => {
    console.log("🚦 POST /capacitaciones - Iniciando carga unificada...");
    next();
  },
  // Aceptamos fotos, firma del expositor y las firmas de los trabajadores
  upload.fields([
    { name: "evidencias", maxCount: 20 },
    { name: "expositor_firma", maxCount: 1 },
    { name: "firmas_participantes" }, // 🟢 NUEVO: Firmas manuales
  ]),
  (req, res, next) => {
    // 🟢 LOG SEGURO: Usamos validación opcional para evitar el TypeError
    const evidencias =
      req.files && req.files["evidencias"] ? req.files["evidencias"].length : 0;
    const tieneFirma = req.files && req.files["expositor_firma"] ? "SÍ" : "NO";
    const firmasTrabajadores =
      req.files && req.files["firmas_participantes"]
        ? req.files["firmas_participantes"].length
        : 0;

    console.log(
      `🚦 Multer finalizado. Evidencias: ${evidencias} | Firma Expositor: ${tieneFirma} | Firmas Participantes: ${firmasTrabajadores}`,
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
  // 🟢 AÑADIDO: También permitimos recibir firmas de participantes en el Editar
  upload.fields([
    { name: "evidencias", maxCount: 20 },
    { name: "expositor_firma", maxCount: 1 },
    { name: "firmas_participantes" },
  ]),
  controller.actualizarCapacitacion,
);

// 6. Eliminar
router.delete("/:id", verificarToken, controller.eliminarCapacitacion);

module.exports = router;
