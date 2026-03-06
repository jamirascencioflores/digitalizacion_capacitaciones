// backend/src/routes/gestion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/gestion.controller");

// 🟢 1. IMPORTAMOS TU MIDDLEWARE DE SEGURIDAD
const { verificarToken } = require("../middlewares/auth.middleware");

// CONFIGURACIÓN: Guardar en Memoria (RAM)
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// 🟢 2. PROTEGEMOS TODAS LAS RUTAS (Agregando verificarToken)

// Protegemos la subida del plan (para que el backend sepa si es Auditor y lo bloquee)
router.post(
  "/plan",
  verificarToken,
  upload.single("file"),
  controller.subirPlanAnual,
);

// Protegemos el avance (para que sepa si es Supervisor y filtre sus datos)
router.get("/avance", verificarToken, controller.obtenerAvance);

// Protegemos la lista de temas
router.get("/temas", verificarToken, controller.obtenerListaTemas);

module.exports = router;
