const express = require("express");
const router = express.Router();
const controller = require("../controllers/capacitacion.controller");
const { obtenerDetalleCumplimiento } = require('../controllers/capacitacion.controller');
const verificarToken = require("../middlewares/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); 


// Configuración Multer más segura
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/evidencias/";
    // Crear carpeta si no existe (ESTO EVITA EL ERROR 500)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "evidencia-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Rutas
router.post(
  "/",
  verificarToken,
  upload.array("evidencias", 5),
  controller.crearCapacitacion
);
router.get("/", verificarToken, controller.obtenerCapacitaciones);
router.get("/:id", verificarToken, controller.obtenerCapacitacion);
router.get("/exportar/excel", verificarToken, controller.exportarExcel);
router.get('/detalle/:id', obtenerDetalleCumplimiento);

// El PUT debe tener el upload.array también
router.put(
  "/:id",
  verificarToken,
  upload.array("evidencias", 5),
  controller.actualizarCapacitacion
);

router.delete("/:id", verificarToken, controller.eliminarCapacitacion);

module.exports = router;
