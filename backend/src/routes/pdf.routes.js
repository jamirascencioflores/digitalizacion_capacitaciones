// backend/src/routes/pdf.routes.js
const { Router } = require("express");
const router = Router();
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/pdf.controller");

// DEBUG: Verificar que la función existe al cargar
console.log("--- DEBUG RUTA PDF ---");
console.log("Generar PDF:", controller.generarPDF ? "OK" : "FALTA");
console.log("----------------------");

// Definir la ruta GET /api/pdf/:id
router.get("/:id", authMiddleware, controller.generarPDF);

module.exports = router;
