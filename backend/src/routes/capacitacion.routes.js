// backend/src/routes/capacitacion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/capacitacion.controller");
const {
  obtenerDetalleCumplimiento,
} = require("../controllers/capacitacion.controller");

// 🟢 1. CORRECCIÓN IMPORTANTE: Agregamos llaves { }
const { verificarToken } = require("../middlewares/auth.middleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuración Multer (Está perfecta)
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
const upload = multer({ storage: storage });

// --- RUTAS ---

// 1. Crear
router.post(
  "/",
  verificarToken,
  upload.array("evidencias", 5),
  controller.crearCapacitacion,
);

// 2. Listar todas
router.get("/", verificarToken, controller.obtenerCapacitaciones);

// 🟢 3. RUTAS ESPECÍFICAS (Deben ir ANTES de /:id)
// Si pones esto después de /:id, Express creerá que "exportar" es un ID.
router.get("/exportar/excel", verificarToken, controller.exportarExcel);
router.get("/detalle/:id", verificarToken, obtenerDetalleCumplimiento); // Agregué verificarToken por seguridad

// 4. RUTAS DINÁMICAS (Con :id)
router.get("/:id", verificarToken, controller.obtenerCapacitacion);

router.put(
  "/:id",
  verificarToken,
  upload.array("evidencias", 5),
  controller.actualizarCapacitacion,
);

router.delete("/:id", verificarToken, controller.eliminarCapacitacion);

module.exports = router;
