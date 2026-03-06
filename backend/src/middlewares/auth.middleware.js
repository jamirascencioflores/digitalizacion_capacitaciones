const logger = require("../utils/logger");
const jwt = require("jsonwebtoken"); const verificarToken = (req, res, next) => {
  // Buscamos el token en la cabecera O en las cookies (HttpOnly)
  const authHeader = req.headers["authorization"];
  const tokenHeader = authHeader && authHeader.split(" ")[1];
  const tokenCookie = req.cookies?.token;

  const token = tokenHeader || tokenCookie;

  if (!token) {
    logger.warn(`Intento de acceso denegado a ${req.originalUrl}: Sin token`);
    return res.status(401).json({ error: "Acceso denegado: No hay token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Token inválido o expirado en ${req.originalUrl}`);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = { verificarToken };

