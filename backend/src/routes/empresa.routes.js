// backend/src/routes/empresa.routes.js
const { Router } = require("express");
const {
  obtenerConfiguracion,
  actualizarConfiguracion,
  toggleBotGlobal,
} = require("../controllers/empresa.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", obtenerConfiguracion);

router.put("/", verificarToken, actualizarConfiguracion);

router.put("/toggle-bot", verificarToken, toggleBotGlobal);

module.exports = router;
