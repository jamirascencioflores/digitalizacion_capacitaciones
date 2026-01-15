// backend/src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: No hay token" });
  }

  try {
    // 🟢 CORRECCIÓN: Usar la misma variable de entorno que el Login
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = authMiddleware;
