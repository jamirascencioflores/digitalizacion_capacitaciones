// backend/src/routes/notificacion.routes.js
const express = require("express");
const router = express.Router();
const notificacionController = require("../controllers/notificacion.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

// Todas las rutas protegidas con el token
router.use(verificarToken);

router.get("/", notificacionController.getNotificaciones);
router.put("/leer-todas", notificacionController.marcarTodasComoLeidas);
router.put("/:id/leer", notificacionController.marcarComoLeida);

module.exports = router;
