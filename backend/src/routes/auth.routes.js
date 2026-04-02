// backend/src/routes/auth.routes.js
const { Router } = require("express");
const router = Router();

// 🟢 1. Importamos el middleware con un ALIAS para evitar el conflicto
const {
  verificarToken: authMiddleware,
} = require("../middlewares/auth.middleware");

const { login } = require("../controllers/usuario.controller");
const {
  solicitarRecuperacion,
  invitarUsuario,
  restablecerConToken,
  verificarToken,
} = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const { loginSchema } = require("../schemas/auth.schema");

// Rutas
router.post("/login", validate(loginSchema), login);
router.post("/recuperar", solicitarRecuperacion);

// 🟢 2. Usamos el ALIAS (authMiddleware) para proteger la ruta
router.post("/invitar", authMiddleware, invitarUsuario);

// 3. Esta sigue usando el del controlador normalmente
router.get("/verificar-token", verificarToken);
router.post("/reset-password", restablecerConToken);

module.exports = router;
