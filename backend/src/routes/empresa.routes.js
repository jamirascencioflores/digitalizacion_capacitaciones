const { Router } = require("express");
const {
  obtenerConfiguracion,
  actualizarConfiguracion,
} = require("../controllers/empresa.controller");
const verificarToken = require("../middlewares/auth.middleware");

const router = Router();

// GET /api/empresa (Trae RUC, Revisión, Direcciones)
router.get("/", verificarToken, obtenerConfiguracion);

// PUT /api/empresa (Para editar la revisión o dirección)
router.put("/", verificarToken, actualizarConfiguracion);

module.exports = router;
