// backend/src/routes/auth.routes.js
const { Router } = require("express");
const router = Router();

// Importas 'login' desde Usuario
const { login } = require("../controllers/usuario.controller");

// Importas 'solicitarRecuperacion' desde Auth
const { solicitarRecuperacion, invitarUsuario, restablecerConToken, verificarToken } = require("../controllers/auth.controller");

const validate = require("../middlewares/validate");
const { loginSchema } = require("../schemas/auth.schema");

// Rutas
router.post("/login", validate(loginSchema), login);
router.post("/recuperar", solicitarRecuperacion);
router.post("/invitar", invitarUsuario);
router.get("/verificar-token", verificarToken);
router.post("/reset-password", restablecerConToken);


module.exports = router;
