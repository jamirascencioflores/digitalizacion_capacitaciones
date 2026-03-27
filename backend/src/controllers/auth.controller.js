const prisma = require("../utils/db");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendEmailConPlantilla } = require("../utils/mailer");

/**
 * 1. SOLICITAR RECUPERACIÓN (Pide el correo)
 */
const solicitarRecuperacion = async (req, res) => {
  try {
    const { usuario, rol } = req.body;
    console.log("🔍 [Auth] Buscando usuario:", usuario);

    const user = await prisma.usuarios.findFirst({
      where: {
        OR: [{ usuario: usuario }, { email: usuario }]
      }
    });

    if (!user || !user.email) {
      console.log("⚠️ [Auth] Usuario no encontrado o sin email.");
      return res.status(404).json({ error: "El usuario o correo no está registrado en el sistema." });
    }

    // Generar token de 15 min
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: { reset_token: token, reset_token_exp: expira }
    });

    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const enviado = await sendEmailConPlantilla(user.email, 3, {
      reset_link: resetUrl,
      rol: rol || user.rol || "Usuario",
      ROL: (rol || user.rol || "Usuario").toUpperCase()
    });

    res.json({ message: "Se ha enviado un correo con las instrucciones." });
  } catch (error) {
    res.status(500).json({ error: "Error al procesar solicitud" });
  }
};

/**
 * 1.5 INVITAR USUARIO (NUEVO: Usa JWT para no crear usuario aún)
 */
const invitarUsuario = async (req, res) => {
  try {
    const { email, rol } = req.body;

    // Verificar si ya existe
    const existe = await prisma.usuarios.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: "El usuario ya está registrado." });

    // Generar un token firmado (JWT) que expire en 24h
    const inviteToken = jwt.sign({ email, rol, type: 'INVITE' }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });

    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?inviteToken=${inviteToken}`;

    const enviado = await sendEmailConPlantilla(email, 3, {
      reset_link: resetUrl,
      rol: rol || "Usuario",
      ROL: (rol || "Usuario").toUpperCase()
    });

    res.json({ message: "Invitación enviada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar invitación" });
  }
};

/**
 * 2. RESTABLECER / COMPLETAR REGISTRO
 */
const restablecerConToken = async (req, res) => {
  try {
    const { token, inviteToken, password, nombre } = req.body;

    if (inviteToken) {
      // Caso 1: Invitación (Crear usuario nuevo)
      const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET || 'secret_key');
      if (decoded.type !== 'INVITE') throw new Error("Token inválido");

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      await prisma.usuarios.create({
        data: {
          email: decoded.email,
          rol: decoded.rol,
          usuario: decoded.email.split('@')[0] + Math.floor(Math.random() * 99),
          nombre: nombre || decoded.email.split('@')[0],
          contrasena: hash,
          estado: true
        }
      });

      return res.json({ message: "Registro completado con éxito." });
    }

    // Caso 2: Recuperación (Usuario existente)
    const user = await prisma.usuarios.findFirst({
      where: {
        reset_token: token,
        reset_token_exp: { gt: new Date() }
      }
    });

    if (!user) return res.status(404).json({ error: "El token es inválido o ha expirado." });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await prisma.usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: {
        nombre: nombre || user.nombre,
        contrasena: hash,
        reset_token: null,
        reset_token_exp: null,
        solicita_reset: false,
        estado: true
      }
    });

    res.json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al procesar la solicitud." });
  }
};


/**
 * 3. VERIFICAR TOKEN (Devuelve datos del usuario o invitación)
 */
const verificarToken = async (req, res) => {
  try {
    const { token, inviteToken } = req.query;

    if (inviteToken) {
      const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET || 'secret_key');
      return res.json({ email: decoded.email, rol: decoded.rol, nombre: '', isInvite: true });
    }

    if (!token) return res.status(400).json({ error: "Token requerido" });

    const user = await prisma.usuarios.findFirst({
      where: {
        reset_token: token,
        reset_token_exp: { gt: new Date() }
      }
    });

    if (!user) return res.status(404).json({ error: "Token inválido o expirado" });

    res.json({ email: user.email, rol: user.rol, nombre: user.nombre, isInvite: false });
  } catch (error) {
    res.status(500).json({ error: "Error al verificar token" });
  }
};

module.exports = { solicitarRecuperacion, invitarUsuario, restablecerConToken, verificarToken };


