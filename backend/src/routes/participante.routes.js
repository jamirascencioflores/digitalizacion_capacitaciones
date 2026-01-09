// backend/src/routes/participante.routes.js
const { Router } = require('express');
const { agregarParticipante } = require('../controllers/participante.controller');
const verificarToken = require('../middlewares/auth.middleware');

const router = Router();

// POST Protegido (Solo usuarios logueados pueden agregar gente)
router.post('/', verificarToken, agregarParticipante);

module.exports = router;