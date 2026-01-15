// backend/src/routes/auth.routes.js
const { Router } = require("express");
const { login } = require("../controllers/usuario.controller");

const router = Router();

// Ruta final: POST /api/auth/login
router.post("/login", login);

module.exports = router;
