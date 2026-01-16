// backend/src/routes/gestion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/gestion.controller");

// 🟢 CONFIGURACIÓN: Guardar en Memoria (RAM)
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// La ruta espera un campo llamado "file"
router.post("/plan", upload.single("file"), controller.subirPlanAnual);

// ... otras rutas ...
router.get("/avance", controller.obtenerAvance);
router.get("/temas", controller.obtenerListaTemas);

module.exports = router;
