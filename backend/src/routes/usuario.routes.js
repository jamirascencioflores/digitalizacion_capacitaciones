const { Router } = require('express');
// Importa ahora también 'login'
const { registrarUsuario, login } = require('../controllers/usuario.controller');

const router = Router();

// Rutas
router.post('/', registrarUsuario);      // Crear usuario
router.post('/login', login);            // Iniciar sesión <--- NUEVA

module.exports = router;