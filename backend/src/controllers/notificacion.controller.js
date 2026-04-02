// backend/src/controllers/notificacion.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Obtener las notificaciones más recientes (Blindado para SaaS Multi-tenant)
const getNotificaciones = async (req, res) => {
  try {
    const isSoporte = String(req.user?.rol).toUpperCase() === "SOPORTE";
    const whereClause = isSoporte ? {} : { id_empresa: req.user.id_empresa };

    const notificaciones = await prisma.notificacion.findMany({
      where: whereClause,
      orderBy: { fecha_creacion: "desc" },
      take: 20,
    });

    const sinLeer = await prisma.notificacion.count({
      where: {
        ...whereClause,
        leida: false,
      },
    });

    res.json({ notificaciones, sinLeer });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al cargar notificaciones" });
  }
};

// 🟢 Marcar una sola como leída
const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    // 🟢 CORRECCIÓN: El campo en Prisma es 'id'
    const notificacion = await prisma.notificacion.findUnique({
      where: { id: Number(id) },
    });

    if (!notificacion)
      return res.status(404).json({ error: "Notificación no encontrada" });

    const isSoporte = String(req.user?.rol).toUpperCase() === "SOPORTE";
    if (!isSoporte && notificacion.id_empresa !== req.user.id_empresa) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    // 🟢 CORRECCIÓN: El campo en Prisma es 'id'
    await prisma.notificacion.update({
      where: { id: Number(id) },
      data: { leida: true },
    });

    res.json({ mensaje: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🟢 Marcar TODAS como leídas (Blindado para SaaS Multi-tenant)
const marcarTodasComoLeidas = async (req, res) => {
  try {
    const isSoporte = String(req.user?.rol).toUpperCase() === "SOPORTE";

    // 🛡️ SEGURIDAD SAAS: Solo marcamos las de SU empresa
    const whereClause = isSoporte
      ? { leida: false }
      : { id_empresa: req.user.id_empresa, leida: false };

    await prisma.notificacion.updateMany({
      where: whereClause,
      data: { leida: true },
    });

    res.json({
      message: "Todas tus notificaciones fueron marcadas como leídas",
    });
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
