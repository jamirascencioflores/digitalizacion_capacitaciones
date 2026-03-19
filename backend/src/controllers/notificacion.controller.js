// backend/src/controllers/notificacion.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Obtener las notificaciones más recientes (ej. últimas 20)
const getNotificaciones = async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      orderBy: { fecha_creacion: "desc" },
      take: 20,
    });

    // Contamos cuántas están sin leer para el globito rojo
    const sinLeer = await prisma.notificacion.count({
      where: { leida: false },
    });

    res.json({ notificaciones, sinLeer });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Marcar una notificación como leída
const marcarComoLeida = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.notificacion.update({
      where: { id: Number(id) },
      data: { leida: true },
    });
    res.json({ message: "Notificación leída" });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ error: "Error al actualizar notificación" });
  }
};

// Marcar TODAS como leídas de golpe
const marcarTodasComoLeidas = async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { leida: false },
      data: { leida: true },
    });
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("Error al marcar todas las notificaciones:", error);
    res.status(500).json({ error: "Error al actualizar notificaciones" });
  }
};

module.exports = {
  getNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
};
