// backend/src/controllers/contacto.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 🟢 1. RECIBIR DATOS DE LA LANDING PAGE (Público)
const crearSolicitud = async (req, res) => {
  try {
    const { nombre, empresa, telefono, email, mensaje } = req.body;

    // Validación básica para que no envíen formularios vacíos
    if (!nombre || !empresa || !telefono || !email || !mensaje) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios." });
    }

    // Guardar en la base de datos
    const nuevaSolicitud = await prisma.solicitudes_contacto.create({
      data: {
        nombre,
        empresa,
        telefono,
        email,
        mensaje,
      },
    });

    res.status(201).json({
      mensaje: "¡Solicitud enviada con éxito! Nos contactaremos pronto.",
      data: nuevaSolicitud,
    });
  } catch (error) {
    console.error("Error al guardar la solicitud de contacto:", error);
    res
      .status(500)
      .json({
        error: "Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.",
      });
  }
};

// 🔵 2. VER TODAS LAS SOLICITUDES (Solo para el Admin)
const obtenerSolicitudes = async (req, res) => {
  try {
    // Traemos todas ordenadas por las más recientes primero
    const solicitudes = await prisma.solicitudes_contacto.findMany({
      orderBy: { fecha_envio: "desc" },
    });
    res.json(solicitudes);
  } catch (error) {
    console.error("Error al listar solicitudes:", error);
    res.status(500).json({ error: "Error al obtener la bandeja de entrada." });
  }
};

// 🔵 3. CAMBIAR ESTADO (Ej: De "Pendiente" a "Atendido")
const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const solicitudActualizada = await prisma.solicitudes_contacto.update({
      where: { id_solicitud: Number(id) },
      data: { estado },
    });

    res.json(solicitudActualizada);
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: "Error al actualizar la solicitud." });
  }
};

module.exports = {
  crearSolicitud,
  obtenerSolicitudes,
  actualizarEstado,
};
