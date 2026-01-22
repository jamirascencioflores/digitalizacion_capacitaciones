// backend/src/controllers/auth.controller.js
const prisma = require("../utils/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // <--- Necesitamos esto sí o sí

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    // 1. Buscar usuario
    const user = await prisma.usuarios.findUnique({ where: { usuario } });

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // 2. Verificar contraseña ENCRIPTADA
    // Usamos 'user.contrasena' (el nombre real en tu BD)
    // bcrypt compara "123456" con el código secreto "$2a$10$..."
    const valid = await bcrypt.compare(password, user.contrasena);

    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 3. Generar Token
    const token = jwt.sign(
      {
        id: user.id_usuario,
        rol: user.rol,
        nombre: user.nombre, 
      },
      "secreto_super_seguro",
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: {
        id: user.id_usuario,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};
const solicitarRecuperacion = async (req, res) => {
  try {
    const { usuario } = req.body;

    // Buscamos si existe
    const user = await prisma.usuarios.findUnique({ where: { usuario } });
    
    if (!user) {
      // Por seguridad, no decimos si existe o no, pero simulamos éxito
      return res.json({ message: "Si el usuario existe, se notificó al admin." });
    }

    // Marcamos la solicitud
    await prisma.usuarios.update({
      where: { usuario },
      data: { solicita_reset: true }
    });

    res.json({ message: "Solicitud enviada. Contacta al administrador." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar solicitud" });
  }
};

module.exports = { login, solicitarRecuperacion };
