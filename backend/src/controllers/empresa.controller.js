// backend/src/controllers/empresa.controller.js
const prisma = require("../utils/db");

// Obtener la configuración actual (para mostrar en el frontend)
const obtenerConfiguracion = async (req, res) => {
  try {
    // Buscamos la primera fila (ID 1)
    let empresa = await prisma.empresa.findFirst();

    // Si no existe (es la primera vez), la creamos con los defaults del Schema
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          // Prisma usará los @default que definimos en el schema
          // nombre: "AGRICOLA PAMPA BAJA...", ruc: "...", etc.
        },
      });
    }

    res.json(empresa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener datos de empresa" });
  }
};

// Actualizar datos (ej: cambiar Revisión 06 a 07)
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

module.exports = { obtenerConfiguracion, actualizarConfiguracion };
