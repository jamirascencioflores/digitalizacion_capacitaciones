const express = require("express");
const router = express.Router();
const { verificarToken } = require("../middlewares/auth.middleware");

// 1. IMPORTAMOS TODAS LAS FUNCIONES
const {
  obtenerUsuarios,
  registrarUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerSolicitudesReset,
  resetearContrasena,
} = require("../controllers/usuario.controller");

// --- DEBUG CONTROLADOR (Opcional, puedes borrarlo luego) ---
console.log("--- DEBUG CONTROLADOR ---");
console.log("obtenerUsuarios:", obtenerUsuarios);
console.log("-------------------------");

// Prefijo: /api/usuarios

// 🟢 APLICAMOS verificarToken a TODAS las rutas de este archivo
// De esta forma req.user siempre estará definido y no habrá errores de 'rol'
router.use(verificarToken);

// --- RUTAS ESTÁTICAS ---
router.get("/solicitudes", obtenerSolicitudesReset);

// --- RUTAS CRUD ---
router.get("/", obtenerUsuarios); // Ahora req.user.rol funcionará perfecto aquí
router.post("/", registrarUsuario);

// --- RUTAS DINÁMICAS (Con :id) ---
router.put("/:id", actualizarUsuario);
router.delete("/:id", eliminarUsuario);
router.post("/reset/:id", resetearContrasena);

module.exports = router;
