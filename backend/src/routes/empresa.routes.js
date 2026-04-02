// backend/src/routes/empresa.routes.js
const { Router } = require("express");
const multer = require("multer"); // 🟢 Importamos multer directamente

const {
  obtenerConfiguracion,
  actualizarConfiguracion,
  toggleBotGlobal,
  crearEmpresa,
  actualizarEmpresa,
  toggleEstadoEmpresa,
  obtenerSedesEmpresa,
} = require("../controllers/empresa.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// 🟢 Configuramos Multer para que guarde en Memoria (Buffer) y no en el disco
const upload = multer({ storage: multer.memoryStorage() });

// Rutas
router.post("/", verificarToken, crearEmpresa);
router.get("/", obtenerConfiguracion);
router.put("/", verificarToken, actualizarConfiguracion);
router.put("/toggle-bot", verificarToken, toggleBotGlobal);

// 🟢 RUTA PARA EDITAR EMPRESA (Usa el middleware 'upload.single')
router.put(
  "/saas/empresas/:id",
  verificarToken,
  upload.single("logo"),
  actualizarEmpresa,
);

router.get("/mis-sedes", verificarToken, obtenerSedesEmpresa);

router.patch("/saas/empresas/:id/toggle", verificarToken, toggleEstadoEmpresa);

module.exports = router;
