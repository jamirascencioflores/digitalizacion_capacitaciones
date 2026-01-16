// backend/src/routes/usuario.routes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");

// Prefijo en server.js: /api/usuarios

// 1. Obtener lista (GET /api/usuarios)
router.get("/", usuarioController.obtenerUsuarios);

// 2. Crear nuevo - CORREGIDO (POST /api/usuarios)
// Antes decía "/login", cámbialo a "/" para que sea el estándar
router.post("/", usuarioController.registrarUsuario);

// 3. Editar (PUT /api/usuarios/:id)
router.put("/:id", usuarioController.actualizarUsuario);

// 4. Eliminar (DELETE /api/usuarios/:id)
router.delete("/:id", usuarioController.eliminarUsuario);

module.exports = router;
