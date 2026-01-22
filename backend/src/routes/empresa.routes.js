// backend/src/routes/empresa.routes.js
const { Router } = require("express");
const {
  obtenerConfiguracion,
  actualizarConfiguracion,
} = require("../controllers/empresa.controller");

// 🟢 CORRECCIÓN: Agregamos llaves { } para sacar la función del objeto
const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// GET /api/empresa (Trae RUC, Revisión, Direcciones)
router.get("/", verificarToken, obtenerConfiguracion);

// PUT /api/empresa (Para editar la revisión o dirección)
router.put("/", verificarToken, actualizarConfiguracion);

module.exports = router;
