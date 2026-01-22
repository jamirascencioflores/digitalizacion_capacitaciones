// backend/src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");

// 1. Cambiamos el nombre de 'authMiddleware' a 'verificarToken'
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: No hay token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// 2. IMPORTANTE: Exportamos como OBJETO (con llaves)
module.exports = { verificarToken };
