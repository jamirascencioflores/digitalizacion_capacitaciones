// backend/src/routes/auth.routes.js
const { Router } = require("express");
const router = Router();

// Importas 'login' desde Usuario
const { login } = require("../controllers/usuario.controller");

// Importas 'solicitarRecuperacion' desde Auth
const { solicitarRecuperacion } = require("../controllers/auth.controller");

// Rutas
router.post("/login", login);
router.post("/recuperar", solicitarRecuperacion);

module.exports = router;
