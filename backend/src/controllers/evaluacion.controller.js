// backend/src/controllers/evaluacion.controller.js
const prisma = require("../utils/db");

// 1. CREAR UNA EVALUACIÓN (Con preguntas y opciones)
const crearEvaluacion = async (req, res) => {
  try {
    const { id_capacitacion, tipo, titulo, preguntas } = req.body;

    // 'preguntas' debe ser un array con: { enunciado, puntos, opciones: [{ texto, es_correcta }] }

    const nuevaEvaluacion = await prisma.evaluacion.create({
      data: {
        id_capacitacion: parseInt(id_capacitacion),
        tipo,
        titulo,
        preguntas: {
          create: preguntas.map((p) => ({
            enunciado: p.enunciado,
            puntos: p.puntos || 4,
            opciones: {
              create: p.opciones.map((o) => ({
                texto: o.texto,
                es_correcta: o.es_correcta,
              })),
            },
          })),
        },
      },
      include: {
        preguntas: {
          include: { opciones: true },
        },
      },
    });

    res.json({ message: "Evaluación creada con éxito", data: nuevaEvaluacion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear evaluación" });
  }
};

// 2. OBTENER EVALUACIÓN PÚBLICA (Para el celular del trabajador)
// OJO: No enviamos el campo 'es_correcta' para que no hagan trampa viendo el código fuente
const obtenerParaResolver = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { id_evaluacion: parseInt(id) },
      include: {
        capacitacion: {
          select: { tema_principal: true, expositor_nombre: true },
        },
        preguntas: {
          include: {
            opciones: {
              select: { id_opcion: true, texto: true }, // 🔒 Solo texto e ID
            },
          },
        },
      },
    });

    if (!evaluacion) return res.status(404).json({ error: "No encontrada" });
    if (!evaluacion.estado)
      return res.status(400).json({ error: "Evaluación cerrada" });

    res.json(evaluacion);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar examen" });
  }
};

// 3. REGISTRAR INTENTO (Con bloqueo de duplicados y Nota Base 20)
const registrarIntento = async (req, res) => {
  try {
    const { id_evaluacion, dni, nombre, respuestas } = req.body;

    // 🟢 1. VALIDACIÓN ANTI-DUPLICADOS
    const intentoPrevio = await prisma.intentoEvaluacion.findFirst({
      where: {
        id_evaluacion: parseInt(id_evaluacion),
        dni_trabajador: dni,
      },
    });

    if (intentoPrevio) {
      return res
        .status(400)
        .json({ error: "⚠️ Ya has respondido este examen anteriormente." });
    }

    // Obtenemos la hoja de respuestas correcta de la BD
    const evaluacion = await prisma.evaluacion.findUnique({
      where: { id_evaluacion: parseInt(id_evaluacion) },
      include: {
        preguntas: {
          include: { opciones: true },
        },
      },
    });

    let notaBruta = 0;
    let puntajeMaximoPosible = 0;

    // Algoritmo de calificación
    evaluacion.preguntas.forEach((pregunta) => {
      puntajeMaximoPosible += pregunta.puntos;

      const opcionElegidaId = respuestas[pregunta.id_pregunta];
      if (opcionElegidaId) {
        const opcionCorrecta = pregunta.opciones.find((o) => o.es_correcta);
        if (
          opcionCorrecta &&
          opcionCorrecta.id_opcion === parseInt(opcionElegidaId)
        ) {
          notaBruta += pregunta.puntos;
        }
      }
    });

    // Conversión a Base 20
    let notaEnBase20 = 0;
    if (puntajeMaximoPosible > 0) {
      notaEnBase20 = Math.round((notaBruta / puntajeMaximoPosible) * 20);
    }

    const estaAprobado = notaEnBase20 >= 13;

    // Guardar el intento
    await prisma.intentoEvaluacion.create({
      data: {
        id_evaluacion: parseInt(id_evaluacion),
        dni_trabajador: dni,
        nombre_completo: nombre,
        nota: notaEnBase20,
        respuestas_json: JSON.stringify(respuestas),
      },
    });

    res.json({
      message: "Examen enviado",
      nota: notaEnBase20,
      maximo: 20,
      aprobado: estaAprobado,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al calificar" });
  }
};

// 4. OBTENER RESULTADOS (Para el Dashboard del Admin)
const obtenerResultados = async (req, res) => {
  try {
    const { id } = req.params;
    const intentos = await prisma.intentoEvaluacion.findMany({
      where: { id_evaluacion: parseInt(id) },
      orderBy: { nota: "desc" },
    });
    res.json(intentos);
  } catch (error) {
    res.status(500).json({ error: "Error cargando resultados" });
  }
};

// 5. ELIMINAR EVALUACIÓN (Opcional)
const eliminarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.evaluacion.delete({
      where: { id_evaluacion: parseInt(id) },
    });
    res.json({ message: "Evaluación eliminada" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar evaluación" });
  }
};

// 6. EDITAR EVALUACIÓN (Actualizar título, tipo y preguntas)
const editarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, titulo, preguntas } = req.body;

    // Usamos una transacción para que sea seguro:
    // 1. Actualizamos datos básicos
    // 2. Borramos preguntas viejas
    // 3. Creamos preguntas nuevas
    await prisma.$transaction(async (tx) => {
      // A. Actualizar cabecera
      await tx.evaluacion.update({
        where: { id_evaluacion: parseInt(id) },
        data: { tipo, titulo },
      });

      // B. Borrar preguntas antiguas (Cascade borrará las opciones)
      await tx.pregunta.deleteMany({
        where: { id_evaluacion: parseInt(id) },
      });

      // C. Insertar las nuevas preguntas
      for (const p of preguntas) {
        await tx.pregunta.create({
          data: {
            id_evaluacion: parseInt(id),
            enunciado: p.enunciado,
            puntos: p.puntos || 4,
            opciones: {
              create: p.opciones.map((o) => ({
                texto: o.texto,
                es_correcta: o.es_correcta,
              })),
            },
          },
        });
      }
    });

    res.json({ message: "Evaluación actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al editar evaluación" });
  }
};

// 7. ELIMINAR INTENTO (Borrar la nota de un alumno)
const eliminarIntento = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.intentoEvaluacion.delete({
      where: { id_intento: parseInt(id) },
    });
    res.json({ message: "Intento eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar intento" });
  }
};

module.exports = {
  crearEvaluacion,
  obtenerParaResolver,
  registrarIntento,
  obtenerResultados,
  eliminarEvaluacion,
  editarEvaluacion,
  eliminarIntento,
};
