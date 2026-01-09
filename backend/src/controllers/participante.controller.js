// backend/src/controllers/participante.controller.js
const prisma = require('../utils/db');

const agregarParticipante = async (req, res) => {
  try {
    const { id_capacitacion, dni, apellidos_nombres, area_cargo, firma_url } = req.body;

    // Validar datos básicos
    if (!id_capacitacion || !dni || !apellidos_nombres || !area_cargo) {
      return res.status(400).json({ error: 'Faltan datos del participante' });
    }

    // --- CAMBIO: ELIMINAMOS EL BLOQUEO DE 12 PARTICIPANTES ---
    // Solo contamos para saber qué número de orden le toca (1, 2, 13, 50...)
    const cantidadActual = await prisma.participantes.count({
      where: { id_capacitacion: Number(id_capacitacion) }
    });

    // Si hay 100, este será el 101. Ya no lanzamos error.
    const numeroOrden = cantidadActual + 1;

    // Guardar participante
    const nuevoParticipante = await prisma.participantes.create({
      data: {
        id_capacitacion: Number(id_capacitacion),
        numero: numeroOrden,
        dni,
        apellidos_nombres,
        area_cargo,
        firma_url: firma_url || null
      }
    });

    res.status(201).json({
      mensaje: 'Participante agregado correctamente ✅',
      participante: nuevoParticipante
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agregar participante' });
  }
};

module.exports = { agregarParticipante };