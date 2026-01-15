// backend/src/routes/usuario.routes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");

// Prefijo en server.js: /api/usuarios

// 1. Obtener lista
router.get("/", usuarioController.obtenerUsuarios);

// 2. Crear nuevo (Admin)
router.post("/", usuarioController.registrarUsuario);

// 3. Editar
router.put("/:id", usuarioController.actualizarUsuario);

// 4. Eliminar
router.delete("/:id", usuarioController.eliminarUsuario);

module.exports = router;
