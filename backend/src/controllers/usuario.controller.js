// backend/src/controllers/usuario.controller.js
const prisma = require("../utils/db"); // O verifica si tu ruta es ("../lib/prisma")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- 1. LOGIN (Necesario para entrar) ---
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

    // Quitamos la contraseña de la respuesta
    const { contrasena: _, ...datosUsuario } = userEncontrado;

    res.json({
      mensaje: "Bienvenido al Sistema 👋",
      token: token,
      usuario: datosUsuario,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

// --- 2. OBTENER USUARIOS (Nuevo: Para el Panel Admin) ---
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id_usuario: true,
        nombre: true, // O 'nombre_completo' según tu schema.prisma
        usuario: true,
        rol: true,
        estado: true,
      },
      orderBy: { id_usuario: "asc" },
    });

    // Mapeamos para que el frontend reciba "nombre_completo" si en la BD se llama "nombre"
    const usuariosFormateados = usuarios.map((u) => ({
      ...u,
      nombre_completo: u.nombre || u.nombre_completo,
    }));

    res.json(usuariosFormateados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// --- 3. REGISTRAR/CREAR USUARIO (Unificado) ---
const registrarUsuario = async (req, res) => {
  try {
    // El frontend envía: nombre_completo, usuario, password, rol
    // Tu BD espera: nombre, usuario, contrasena, rol
    const { nombre_completo, nombre, usuario, password, contrasena, rol } =
      req.body;

    // Normalizamos los nombres de variables
    const nombreFinal = nombre_completo || nombre;
    const passFinal = password || contrasena;

    // Validar
    if (!nombreFinal || !usuario || !passFinal || !rol) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Verificar duplicados
    const existe = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (existe) {
      return res
        .status(400)
        .json({ error: "El nombre de usuario ya está en uso" });
    }

    // Encriptar
    const salt = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(passFinal, salt);

    // Guardar
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre: nombreFinal, // Asegúrate que en tu schema.prisma se llame 'nombre' o cámbialo aquí
        usuario,
        contrasena: hashContrasena,
        rol,
        estado: true,
      },
    });

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
    } = req.body;

    // Normalizamos variables
    const nombreFinal = nombre_completo || nombre;
    const passFinal = password || contrasena;

    // Validar campos obligatorios (La contraseña es opcional al editar)
    // Nota: Verificamos que 'estado' no sea undefined (puede ser false)
    if (!nombreFinal || !usuario || !rol || estado === undefined) {
      return res
        .status(400)
        .json({
          error: "Faltan campos obligatorios (nombre, usuario, rol, estado)",
        });
    }

    const idUsuario = parseInt(id);

    // Verificar si el nombre de usuario ya existe (excluyendo al propio usuario que editamos)
    const existe = await prisma.usuarios.findUnique({
      where: { usuario: usuario },
    });

    if (existe && existe.id_usuario !== idUsuario) {
      return res
        .status(400)
        .json({
          error: "El nombre de usuario ya está en uso por otra persona",
        });
    }

    // Preparar objeto de datos
    const datosActualizar = {
      nombre: nombreFinal, // O 'nombre_completo' según tu schema
      usuario,
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

// --- 5. ELIMINAR USUARIO (Con protección de Integridad) ---
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

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

module.exports = {
  login,
  obtenerUsuarios,
  registrarUsuario,
  actualizarUsuario,
  eliminarUsuario,
};
