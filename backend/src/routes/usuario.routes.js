const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth.middleware");

// 1. IMPORTAMOS TODAS LAS FUNCIONES DESGLOSADAS
const {
  obtenerUsuarios,
  registrarUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerSolicitudesReset,
  resetearContrasena,
} = require("../controllers/usuario.controller");

console.log("--- DEBUG CONTROLADOR ---");
console.log("obtenerUsuarios:", obtenerUsuarios); // Debería salir [AsyncFunction]
console.log("obtenerSolicitudesReset:", obtenerSolicitudesReset); // Si sale 'undefined', algo raro pasa.
console.log("-------------------------");

// Prefijo: /api/usuarios
// --- RUTAS ESTÁTICAS (Van primero para evitar conflictos) ---
router.get("/solicitudes", verificarToken, obtenerSolicitudesReset);

// --- RUTAS CRUD ---
router.get("/", obtenerUsuarios);
router.post("/", registrarUsuario); // Verifica si tu función se llama crearUsuario

// --- RUTAS DINÁMICAS (Con :id) ---
router.put("/:id", actualizarUsuario); // Verifica si tu función se llama editarUsuario
router.delete("/:id", eliminarUsuario);
router.post("/reset/:id", verificarToken, resetearContrasena);

module.exports = router;
