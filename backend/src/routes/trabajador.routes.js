// backend/src/routes/trabajador.routes.js
const { Router } = require("express");
const router = Router();
const controller = require("../controllers/trabajador.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// --- RUTAS ESTÁTICAS (VAN PRIMERO) ---

// 1. LISTADO GENERAL (Corregido a "/listado" y movido al inicio)
router.get("/listado", authMiddleware, controller.getTrabajadoresSelect);

// 2. CARGA MASIVA
router.post(
  "/upload-masivo",
  authMiddleware,
  upload.array("firmas"),
  controller.cargaMasivaFirmas
);

// --- RUTAS GENERALES ---
router.get("/", authMiddleware, controller.obtenerTrabajadores);
router.post("/", authMiddleware, controller.guardarTrabajador);

// --- RUTAS DINÁMICAS (VAN AL FINAL) ---
// Si pones estas al principio, ":dni" interceptará la palabra "listado"
router.get("/:dni", authMiddleware, controller.buscarPorDNI);
router.delete("/:id", authMiddleware, controller.eliminarTrabajador);

module.exports = router;
