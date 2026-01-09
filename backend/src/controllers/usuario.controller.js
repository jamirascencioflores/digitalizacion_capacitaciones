// backend/src/controllers/usuario.controller.js
const prisma = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- FUNCIÓN 1: REGISTRAR USUARIO ---
const registrarUsuario = async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;

    // Validar que lleguen los datos
    if (!nombre || !usuario || !contrasena || !rol) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Verificar si el usuario ya existe
    const existe = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (existe) {
      return res
        .status(400)
        .json({ error: "El nombre de usuario ya está en uso" });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(contrasena, salt);

    // Guardar en Base de Datos
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre,
        usuario,
        contrasena: hashContrasena,
        rol,
        estado: true,
      },
    });

    // Responder (sin la contraseña)
    const { contrasena: _, ...usuarioSinPass } = nuevoUsuario;

    res.status(201).json({
      mensaje: "Usuario creado con éxito 🎉",
      usuario: usuarioSinPass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};

// --- FUNCIÓN 2: INICIAR SESIÓN (LOGIN) ---
const login = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: "Ingrese usuario y contraseña" });
    }

    // Buscar usuario
    const userEncontrado = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (!userEncontrado) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // Verificar contraseña
    const passValido = await bcrypt.compare(
      contrasena,
      userEncontrado.contrasena
    );

    if (!passValido) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // Generar Token JWT
    const token = jwt.sign(
      {
        id: userEncontrado.id_usuario,
        rol: userEncontrado.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    const { contrasena: _, ...datosUsuario } = userEncontrado;

    res.json({
      mensaje: "Bienvenido al Sistema 👋",
      token: token,
      usuario: datosUsuario, // Ahora esto incluye: id_usuario, rol, nombre, usuario
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

// Exportar AMBAS funciones
module.exports = {
  registrarUsuario,
  login,
};
