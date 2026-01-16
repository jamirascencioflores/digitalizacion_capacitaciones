// backend/src/routes/trabajador.routes.js
console.log("🟢 ---> CARGANDO RUTAS NUEVAS DE TRABAJADOR <--- 🟢");
const { Router } = require("express");
const router = Router();
const controller = require("../controllers/trabajador.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// 🔴 BORRA CUALQUIER LÍNEA QUE SE PAREZCA A ESTO:
// const { upload } = require("../controllers/upload.controller");
// const upload = require("../middlewares/upload.middleware");

// 🟢 AGREGA ESTO EN SU LUGAR (Esto fuerza el uso de Memoria RAM para Cloudinary):
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// --- RUTAS ESTÁTICAS ---
router.get("/listado", authMiddleware, controller.getTrabajadoresSelect);

// Ruta para carga masiva de firmas
router.post(
  "/upload-masivo",
  authMiddleware,
  upload.array("firmas"), // <--- Usa la variable 'upload' que definimos arriba
  controller.cargaMasivaFirmas
);

// Ruta para importar Excel
router.post(
  "/importar-excel",
  authMiddleware,
  upload.single("excel"),
  controller.importarExcelInteligente
);

// --- RUTAS GENERALES ---
router.get("/", authMiddleware, controller.obtenerTrabajadores);

// Ruta para CREAR trabajador (con firma individual)
router.post(
  "/",
  authMiddleware,
  upload.single("firma"), // <--- Esto capturará la firma en RAM
  controller.guardarTrabajador
);

// ... Resto de rutas (PUT, DELETE, etc) ...
router.get("/:dni", authMiddleware, controller.buscarPorDNI);

router.put(
  "/:id",
  authMiddleware,
  upload.single("firma"), // <--- Esto permite actualizar firma en RAM
  controller.actualizarTrabajador
);

router.put("/:id/eliminar-firma", authMiddleware, controller.eliminarFirma);
router.delete("/:id", authMiddleware, controller.eliminarTrabajador);

module.exports = router;
