// backend/src/controllers/usuario.controller.js
const prisma = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const logger = require("../utils/logger");

// --- 1. LOGIN (Necesario para entrar) ---
const login = async (req, res) => {
  const { usuario, contrasena } = req.body;
  logger.info(`Intento de login para usuario: ${usuario}`);

  try {
    const userEncontrado = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (
      !userEncontrado ||
      !(await bcrypt.compare(contrasena, userEncontrado.contrasena))
    ) {
      logger.warn(`Credenciales inválidas para: ${usuario}`);
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 🟢 NUEVO: Validar si la empresa está suspendida (SaaS)
    if (userEncontrado.id_empresa) {
      const empresa = await prisma.empresa.findUnique({
        where: { id_empresa: userEncontrado.id_empresa },
      });

      if (empresa && !empresa.estado) {
        logger.warn(
          `Intento de acceso bloqueado: Empresa suspendida para ${usuario}`,
        );
        return res.status(403).json({
          error: "Su empresa se encuentra suspendida. Contacte a soporte.",
        });
      }
    }

    // 🟢 MODIFICADO: Agregamos id_empresa al token
    const token = jwt.sign(
      {
        id: userEncontrado.id_usuario,
        rol: userEncontrado.rol,
        id_empresa: userEncontrado.id_empresa, // <-- NUEVO
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000,
    });

    const { contrasena: _, ...datosUsuario } = userEncontrado;

    logger.info(`Login exitoso: ${usuario} (${userEncontrado.rol})`);

    res.json({
      mensaje: "Bienvenido al Sistema 👋",
      token: token,
      usuario: {
        ...datosUsuario,
        solicita_reset: userEncontrado.solicita_reset,
      },
    });
  } catch (error) {
    logger.error(`Error en login para ${usuario}: ${error.message}`);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

// 🟢 OBTENER USUARIOS CON AISLAMIENTO MULTITENANT
const obtenerUsuarios = async (req, res) => {
  try {
    // 🟢 Agregamos los signos de interrogación (?) para evitar crasheos si falta el dato
    const isSoporte = req.user?.rol?.toUpperCase() === "SOPORTE";

    // Condición de búsqueda
    let whereClause = {};

    if (!isSoporte) {
      whereClause = {
        id_empresa: req.user?.id_empresa, // Usamos ? aquí también por seguridad
        rol: { not: "Soporte" },
      };
    }

    const usuarios = await prisma.usuarios.findMany({
      where: whereClause,
      select: {
        id_usuario: true,
        nombre: true,
        usuario: true,
        email: true,
        rol: true,
        estado: true,
        id_empresa: true,
      },
    });

    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// --- 3. REGISTRAR/CREAR USUARIO (Unificado) ---
const { sendEmailManual } = require("../utils/mailer");
const crypto = require("crypto");

const registrarUsuario = async (req, res) => {
  try {
    // Agregamos id_empresa por si SOPORTE lo envía en el body
    const {
      nombre_completo,
      nombre,
      usuario,
      password,
      contrasena,
      rol,
      email,
      id_empresa,
    } = req.body;

    const nombreFinal = nombre_completo || nombre;
    let passOriginal = password || contrasena;

    const esTemporal = !passOriginal;
    if (esTemporal) {
      passOriginal = crypto.randomBytes(4).toString("hex");
    }

    if (!nombreFinal || !usuario || !rol || !email) {
      return res.status(400).json({
        error: "Faltan campos obligatorios (nombre, usuario, rol, email)",
      });
    }

    const existe = await prisma.usuarios.findUnique({ where: { usuario } });
    if (existe) {
      return res
        .status(400)
        .json({ error: "El nombre de usuario ya está en uso" });
    }

    const existeEmail = await prisma.usuarios.findFirst({ where: { email } });
    if (existeEmail) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(passOriginal, salt);

    // 🟢 NUEVO: Decidir a qué empresa va el usuario
    const usuarioActual = req.user || {};
    const empresaDestino =
      usuarioActual.rol === "SOPORTE"
        ? id_empresa || null // SOPORTE puede crear admins para empresas específicas
        : usuarioActual.id_empresa; // Un Admin solo crea dentro de su empresa

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre: nombreFinal,
        usuario,
        email,
        contrasena: hashContrasena,
        rol,
        estado: true,
        solicita_reset: true,
        id_empresa: empresaDestino, // <-- Se guarda la relación
      },
    });

    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`;
    const html = `
      <h1>Bienvenido a FormApp, ${nombreFinal}</h1>
      <p>Se ha creado una cuenta para ti en el sistema de capacitaciones.</p>
      <p><strong>Usuario:</strong> ${usuario}</p>
      <p><strong>Contraseña Temporal:</strong> ${passOriginal}</p>
      <p>Por seguridad, se te pedirá cambiar tu contraseña al iniciar sesión por primera vez.</p>
      <a href="${loginUrl}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Iniciar Sesión</a>
    `;

    await sendEmailManual(
      email,
      "Bienvenido a FormApp - Tus credenciales",
      html,
    );

    const { contrasena: _, ...usuarioSinPass } = nuevoUsuario;

    res.status(201).json({
      mensaje: "Usuario creado con éxito y correo enviado 📧",
      usuario: usuarioSinPass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};

// --- 4. ACTUALIZAR USUARIO ---
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_completo,
      nombre,
      usuario,
      password,
      contrasena,
      rol,
      estado,
      email,
    } = req.body;

    // Normalizamos variables
    const nombreFinal = nombre_completo || nombre;
    const passFinal = password || contrasena;

    // Validar campos obligatorios (La contraseña es opcional al editar)
    // Nota: Verificamos que 'estado' no sea undefined (puede ser false)
    if (!nombreFinal || !usuario || !rol || estado === undefined) {
      return res.status(400).json({
        error: "Faltan campos obligatorios (nombre, usuario, rol, estado)",
      });
    }

    const idUsuario = parseInt(id);

    // Verificar si el nombre de usuario ya existe (excluyendo al propio usuario que editamos)
    const existe = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (existe && existe.id_usuario !== idUsuario) {
      return res.status(400).json({
        error: "El nombre de usuario ya está en uso por otra persona",
      });
    }

    // Preparar objeto de datos
    const datosActualizar = {
      nombre: nombreFinal, // O 'nombre_completo' según tu schema
      usuario,
      email,
      rol,
      estado,
    };

    // Solo si mandaron contraseña nueva, la encriptamos y la agregamos
    if (passFinal && passFinal.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      datosActualizar.contrasena = await bcrypt.hash(passFinal, salt);
    }

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id_usuario: idUsuario },
      data: datosActualizar,
    });

    // Quitamos el hash antes de responder
    const { contrasena: _, ...usuarioSinPass } = usuarioActualizado;

    res.json({
      mensaje: "Usuario actualizado correctamente ✅",
      usuario: usuarioSinPass,
    });
  } catch (error) {
    console.error(error);
    // Error P2025 es "Record not found" en Prisma
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

// --- 5. ELIMINAR USUARIO (Con protección de Integridad y Aislamiento SaaS) ---
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // 🟢 SEGURIDAD 1: No eliminarse a sí mismo
    if (Number(id) === req.user.id_usuario) {
      return res
        .status(400)
        .json({ error: "No puedes eliminar tu propia cuenta." });
    }

    // 🟢 SEGURIDAD 2: Aislamiento Multitenant
    if (String(req.user.rol).toUpperCase() !== "SOPORTE") {
      const targetUser = await prisma.usuarios.findUnique({
        where: { id_usuario: Number(id) },
      });
      if (!targetUser || targetUser.id_empresa !== req.user.id_empresa) {
        return res.status(403).json({
          error: "Acceso denegado: El usuario pertenece a otra empresa.",
        });
      }
    }

    await prisma.usuarios.delete({
      where: { id_usuario: parseInt(id) },
    });

    res.json({ mensaje: "Usuario eliminado correctamente 🗑️" });
  } catch (error) {
    console.error(error);
    // Error P2003: Fallo de restricción de clave foránea (El usuario tiene datos relacionados)
    if (error.code === "P2003") {
      return res.status(400).json({
        error:
          "No se puede eliminar: El usuario tiene capacitaciones o registros asociados. Sugerencia: Cambie su estado a 'Inactivo'.",
      });
    }
    // Error P2025: No encontrado
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

// --- OBTENER SOLICITUDES RESET (Con Aislamiento SaaS) ---
const obtenerSolicitudesReset = async (req, res) => {
  try {
    // 🟢 SEGURIDAD: Cada admin solo ve las alertas de SU empresa
    const isSoporte = String(req.user.rol).toUpperCase() === "SOPORTE";
    const whereClause = { solicita_reset: true };

    if (!isSoporte) {
      whereClause.id_empresa = req.user.id_empresa;
    }

    const usuarios = await prisma.usuarios.findMany({
      where: whereClause,
      select: {
        id_usuario: true,
        usuario: true, // Este es el DNI o Username
        nombre: true,
        rol: true,
        fecha_creacion: true, // Opcional si tienes fecha
      },
    });
    res.json(usuarios);
  } catch (error) {
    console.error("❌ Error en obtenerSolicitudesReset:", error);
    res.status(500).json({ error: "Error al cargar alertas" });
  }
};

// --- RESETEAR CONTRASEÑA (Con Aislamiento SaaS) ---
const resetearContrasena = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaContrasena } = req.body;

    // Buscamos al usuario
    const user = await prisma.usuarios.findUnique({
      where: { id_usuario: Number(id) },
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // 🟢 SEGURIDAD: Evitar que un admin le resetee la clave a alguien de otra empresa
    if (
      String(req.user.rol).toUpperCase() !== "SOPORTE" &&
      user.id_empresa !== req.user.id_empresa
    ) {
      return res.status(403).json({
        error: "Acceso denegado: El usuario pertenece a otra empresa.",
      });
    }

    // DECISIÓN: ¿Usamos la que escribió el admin o el Username/DNI?
    const passFinal =
      nuevaContrasena && nuevaContrasena.trim() !== ""
        ? nuevaContrasena
        : user.usuario;

    // Encriptamos
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passFinal, salt);

    // Actualizamos
    await prisma.usuarios.update({
      where: { id_usuario: Number(id) },
      data: {
        contrasena: hash,
        solicita_reset: false, // Apagamos la alerta
      },
    });

    res.json({ message: `Contraseña actualizada correctamente.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
};

module.exports = {
  login,
  obtenerUsuarios,
  registrarUsuario,
  actualizarUsuario,
  eliminarUsuario,
  obtenerSolicitudesReset,
  resetearContrasena,
};
