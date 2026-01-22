// backend/src/routes/upload.routes.js
const { Router } = require("express");
const { upload, subirArchivo } = require("../controllers/upload.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = Router();

// POST /api/upload
// 'file' es el nombre del campo que enviará el frontend
router.post("/", verificarToken, upload.single("file"), subirArchivo);

module.exports = router;
