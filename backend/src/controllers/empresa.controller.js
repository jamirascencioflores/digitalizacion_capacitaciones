// backend/src/controllers/empresa.controller.js
const prisma = require("../utils/db");

// Obtener la configuración actual
const obtenerConfiguracion = async (req, res) => {
  try {
    let empresa = await prisma.empresa.findFirst();
    if (!empresa) {
      empresa = await prisma.empresa.create({ data: {} });
    }
    res.json(empresa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener datos de empresa" });
  }
};

// Actualizar configuración general
const actualizarConfiguracion = async (req, res) => {
  try {
    const { id_empresa, ...datos } = req.body;
    const actualizada = await prisma.empresa.update({
      where: { id_empresa: Number(id_empresa) },
      data: datos,
    });
    res.json({ mensaje: "Configuración actualizada", data: actualizada });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar" });
  }
};

// 🟢 Función dinámica para ambos botones del Bot
const toggleBotGlobal = async (req, res) => {
  try {
    // Recibimos qué bot queremos cambiar ('publico' o 'interno') y su nuevo estado
    const { tipo, estado } = req.body;
    const empresa = await prisma.empresa.findFirst();

    if (!empresa)
      return res.status(404).json({ error: "Empresa no encontrada" });

    // Preparamos qué columna vamos a actualizar
    const dataToUpdate = {};
    if (tipo === "publico") dataToUpdate.bot_activo = Boolean(estado);
    if (tipo === "interno") dataToUpdate.bot_interno_activo = Boolean(estado);

    const actualizada = await prisma.empresa.update({
      where: { id_empresa: empresa.id_empresa },
      data: dataToUpdate,
    });

    res.json({ mensaje: "Estado del bot actualizado", data: actualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el bot" });
  }
};

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
  toggleBotGlobal, // 🟢 No olvides exportarlo
};
