// backend/src/routes/trabajador.routes.js
const { Router } = require("express");
const router = Router();
const controller = require("../controllers/trabajador.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// --- RUTAS ESTÁTICAS (VAN PRIMERO) ---

// 1. LISTADO GENERAL
router.get("/listado", authMiddleware, controller.getTrabajadoresSelect);

// 2. CARGA MASIVA DE FIRMAS (IMÁGENES)
router.post(
  "/upload-masivo",
  authMiddleware,
  upload.array("firmas"),
  controller.cargaMasivaFirmas
);

// 🟢 3. IMPORTAR EXCEL MASIVO (NUEVO)
// Usamos 'upload.single("excel")' porque subimos un solo archivo .xlsx
router.post(
  "/importar-excel",
  authMiddleware,
  upload.single("excel"),
  controller.importarExcelInteligente
);

// --- RUTAS GENERALES ---
router.get("/", authMiddleware, controller.obtenerTrabajadores);
router.post("/", authMiddleware, controller.guardarTrabajador);

// --- RUTAS DINÁMICAS (VAN AL FINAL) ---
router.get("/:dni", authMiddleware, controller.buscarPorDNI);

router.put("/:id", authMiddleware, controller.actualizarTrabajador);

// 🟢 4. ELIMINAR SOLO LA FIRMA (NUEVO)
router.put("/:id/eliminar-firma", authMiddleware, controller.eliminarFirma);

// Eliminar trabajador completo
router.delete("/:id", authMiddleware, controller.eliminarTrabajador);


module.exports = router;
