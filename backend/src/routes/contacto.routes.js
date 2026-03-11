// backend/src/routes/contacto.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/contacto.controller");

// Importamos el candado de seguridad
const { verificarToken } = require("../middlewares/auth.middleware");

// 🟢 RUTA PÚBLICA: Cualquiera que visite la Landing Page puede enviar un mensaje
router.post("/", controller.crearSolicitud);

// 🔵 RUTAS PRIVADAS: Solo los usuarios logueados (idealmente Admins) pueden ver y editar
router.get("/", verificarToken, controller.obtenerSolicitudes);
router.put("/:id/estado", verificarToken, controller.actualizarEstado);

module.exports = router;
