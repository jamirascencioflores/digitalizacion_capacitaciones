// backend/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Obtener el token del encabezado (Authorization: Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Quitamos la palabra "Bearer"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: No hay token' });
  }

  try {
    // 2. Verificar el token
    // IMPORTANTE: Aquí usamos la MISMA clave que en auth.controller.js
    const decoded = jwt.verify(token, 'secreto_super_seguro');
    
    // 3. Guardar los datos del usuario en la petición para usarlos luego
    req.user = decoded;
    
    next(); // Dejar pasar
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;