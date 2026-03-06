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
    const { usuario } = req.body;
    console.log("🔍 [Auth] Buscando usuario:", usuario);

    const user = await prisma.usuarios.findFirst({
      where: {
        OR: [{ usuario: usuario }, { email: usuario }]
      }
    });

    if (!user || !user.email) {
      console.log("⚠️ [Auth] Usuario no encontrado o sin email.");
      return res.json({ message: "Si el usuario está registrado, recibirá un enlace." });
    }

    // Generar token de 15 min
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: { reset_token: token, reset_token_exp: expira }
    });

    // Enlace final (detecta automáticamente si es puerto 3000, 3001 o producción)
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    console.log("📧 [Auth] Enviando a:", user.email);

    // Enviamos el parámetro de dos formas por si acaso la plantilla usa mayúsculas
    const enviado = await sendEmailConPlantilla(user.email, 1, {
      reset_link: resetUrl,
      RESET_LINK: resetUrl
    });

    if (enviado) {
      console.log("🚀 [Auth] ¡Correo enviado con éxito!");
    } else {
      console.log("❌ [Auth] Brevo rechazó el envío.");
    }

    res.json({ message: "Se ha enviado un correo con las instrucciones." });
  } catch (error) {
    console.error("❌ Error en solicitarRecuperacion:", error);
    res.status(500).json({ error: "Error al procesar solicitud" });
  }
};

/**
 * 2. RESTABLECER CON TOKEN (La pantalla donde pone la clave nueva)
 */
const restablecerConToken = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.usuarios.findFirst({
      where: {
        reset_token: token,
        reset_token_exp: { gte: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await prisma.usuarios.update({
      where: { id_usuario: user.id_usuario },
      data: {
        contrasena: hash,
        reset_token: null,
        reset_token_exp: null,
        solicita_reset: false
      }
    });

    console.log("✅ [Auth] Contraseña actualizada para:", user.usuario);
    res.json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("❌ Error en restablecerConToken:", error);
    res.status(500).json({ error: "Error al restablecer contraseña" });
  }
};

module.exports = { solicitarRecuperacion, restablecerConToken };
