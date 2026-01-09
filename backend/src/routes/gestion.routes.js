// backend/src/routes/gestion.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/gestion.controller");
const upload = require("../middlewares/upload.middleware"); 
const { obtenerListaTemas } = require('../controllers/gestion.controller');

// Ruta para subir el plan anual desde un archivo Excel
router.post("/plan", upload.single("file"), controller.subirPlanAnual);

// Ruta para obtener los datos del gráfico y listas
// GET /api/gestion/avance
router.get("/avance", controller.obtenerAvance);
router.get('/temas', obtenerListaTemas);

module.exports = router;
