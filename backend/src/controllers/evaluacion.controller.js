const prisma = require("../utils/db");

// 🟢 FUNCIÓN AUXILIAR: Barajar Arrays (Random)
const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  return array.sort(() => Math.random() - 0.5);
};

// 1. CREAR EVALUACIÓN (A prueba de balas contra Strings del Frontend)
const crearEvaluacion = async (req, res) => {
  try {
    const { id_capacitacion, tipo, titulo, preguntas, minutos_duracion } =
      req.body;

    if (!id_capacitacion || !preguntas) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    let fechaCierre = null;
    if (minutos_duracion && parseInt(minutos_duracion) > 0) {
      fechaCierre = new Date();
      fechaCierre.setMinutes(
        fechaCierre.getMinutes() + parseInt(minutos_duracion),
      );
    }

    const nuevaEvaluacion = await prisma.evaluacion.create({
      data: {
        id_capacitacion: parseInt(id_capacitacion),
        tipo,
        titulo,
        fecha_cierre: fechaCierre,
        preguntas: {
          create: preguntas.map((p) => ({
            enunciado: p.enunciado,
            // 🟢 FIX: Forzamos a que sea un Número
            puntos: parseInt(p.puntos) || 4,
            opciones: {
              create: p.opciones.map((o) => ({
                texto: o.texto,
                // 🟢 FIX: Forzamos a que sea un Booleano real
                es_correcta: o.es_correcta === true || o.es_correcta === "true",
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

    res
      .status(201)
      .json({ message: "Evaluación creada con éxito", data: nuevaEvaluacion });
  } catch (error) {
    console.error("Error en crearEvaluacion:", error);
    res
      .status(500)
      .json({ error: "Error al crear evaluación en la base de datos." });
  }
};

// 2. OBTENER EVALUACIÓN PÚBLICA
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
              select: { id_opcion: true, texto: true },
            },
          },
        },
      },
    });

    if (!evaluacion)
      return res.status(404).json({ error: "Evaluación no encontrada" });

    if (!evaluacion.estado) {
      return res
        .status(400)
        .json({ error: "El examen ha sido cerrado por el instructor." });
    }

    if (
      evaluacion.fecha_cierre &&
      new Date() > new Date(evaluacion.fecha_cierre)
    ) {
      return res
        .status(400)
        .json({ error: "El tiempo para responder este examen ha terminado." });
    }

    const evaluacionRandom = { ...evaluacion };
    evaluacionRandom.preguntas = shuffleArray(evaluacionRandom.preguntas);
    evaluacionRandom.preguntas.forEach((p) => {
      p.opciones = shuffleArray(p.opciones);
    });

    res.json(evaluacionRandom);
  } catch (error) {
    console.error("Error en obtenerParaResolver:", error);
    res.status(500).json({ error: "Error al cargar examen" });
  }
};

// 3. REGISTRAR INTENTO
const registrarIntento = async (req, res) => {
  try {
    const { id_evaluacion, dni, nombre, respuestas } = req.body;

    const intentoPrevio = await prisma.intentoEvaluacion.findFirst({
      where: { id_evaluacion: parseInt(id_evaluacion), dni_trabajador: dni },
    });

    if (intentoPrevio) {
      return res
        .status(400)
        .json({ error: "⚠️ Ya has respondido este examen anteriormente." });
    }

    const evaluacion = await prisma.evaluacion.findUnique({
      where: { id_evaluacion: parseInt(id_evaluacion) },
      include: { preguntas: { include: { opciones: true } } },
    });

    let notaBruta = 0;
    let puntajeMaximoPosible = 0;

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

    let notaEnBase20 = 0;
    if (puntajeMaximoPosible > 0) {
      notaEnBase20 = Math.round((notaBruta / puntajeMaximoPosible) * 20);
    }

    const estaAprobado = notaEnBase20 >= 13;

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
    console.error("Error en registrarIntento:", error);
    res.status(500).json({ error: "Error al calificar el examen" });
  }
};

// 4. OBTENER RESULTADOS
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

// 5. ELIMINAR EVALUACIÓN
const eliminarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.evaluacion.delete({ where: { id_evaluacion: parseInt(id) } });
    res.json({ message: "Evaluación eliminada" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
};

// 6. EDITAR EVALUACIÓN (A prueba de balas)
const editarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, titulo, preguntas, minutos_duracion } = req.body;

    let datosActualizar = { tipo, titulo };

    if (minutos_duracion !== undefined && minutos_duracion !== "") {
      const min = parseInt(minutos_duracion);
      if (min > 0) {
        const nuevaFecha = new Date();
        nuevaFecha.setMinutes(nuevaFecha.getMinutes() + min);
        datosActualizar.fecha_cierre = nuevaFecha;
      } else if (min === 0) {
        datosActualizar.fecha_cierre = null;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluacion.update({
        where: { id_evaluacion: parseInt(id) },
        data: datosActualizar,
      });

      await tx.pregunta.deleteMany({ where: { id_evaluacion: parseInt(id) } });

      for (const p of preguntas) {
        await tx.pregunta.create({
          data: {
            id_evaluacion: parseInt(id),
            enunciado: p.enunciado,
            // 🟢 FIX: Forzamos a que sea un Número
            puntos: parseInt(p.puntos) || 4,
            opciones: {
              create: p.opciones.map((o) => ({
                texto: o.texto,
                // 🟢 FIX: Forzamos a que sea un Booleano real
                es_correcta: o.es_correcta === true || o.es_correcta === "true",
              })),
            },
          },
        });
      }
    });

    res.json({ message: "Evaluación actualizada correctamente" });
  } catch (error) {
    console.error("Error en editarEvaluacion:", error);
    res.status(500).json({ error: "Error al editar la evaluación." });
  }
};

// 7. ELIMINAR INTENTO
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

// 8. CAMBIAR ESTADO
const toggleEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await prisma.evaluacion.update({
      where: { id_evaluacion: parseInt(id) },
      data: { estado: estado },
    });
    res.json({ message: `Examen ${estado ? "Abierto" : "Cerrado"}` });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado" });
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
  toggleEstado,
};
