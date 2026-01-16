// backend/src/routes/evaluacion.routes.js
const express = require("express");
const router = express.Router();
const evalController = require("../controllers/evaluacion.controller");

// Rutas API
router.post("/", evalController.crearEvaluacion); // Crear examen (Admin)
router.get("/:id", evalController.obtenerParaResolver); // Ver examen (Trabajador)
router.post("/intento", evalController.registrarIntento); // Enviar respuestas (Trabajador)
router.get("/:id/resultados", evalController.obtenerResultados); // Ver notas (Admin)
router.delete("/:id", evalController.eliminarEvaluacion); // Eliminar examen (Admin)
router.put("/:id", evalController.editarEvaluacion); // Editar examen (Admin)
router.delete("/intento/:id", evalController.eliminarIntento); // Eliminar intento (Admin)
router.put("/:id/estado", evalController.toggleEstado); // 🟢 Nueva ruta para el switch

module.exports = router;
