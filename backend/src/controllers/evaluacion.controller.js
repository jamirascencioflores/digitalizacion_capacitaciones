const prisma = require("../utils/db");

// 🟢 FUNCIÓN AUXILIAR: Barajar Arrays (Random)
const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  return array.sort(() => Math.random() - 0.5);
};

// 1. CREAR EVALUACIÓN (Con lógica de tiempo)
const crearEvaluacion = async (req, res) => {
  try {
    const { id_capacitacion, tipo, titulo, preguntas, minutos_duracion } =
      req.body;

    // Lógica de Tiempo: Si mandan minutos, calculamos la fecha de muerte
    let fechaCierre = null;
    if (minutos_duracion && parseInt(minutos_duracion) > 0) {
      fechaCierre = new Date();
      fechaCierre.setMinutes(
        fechaCierre.getMinutes() + parseInt(minutos_duracion)
      );
    }

    const nuevaEvaluacion = await prisma.evaluacion.create({
      data: {
        id_capacitacion: parseInt(id_capacitacion),
        tipo,
        titulo,
        fecha_cierre: fechaCierre, // Guardamos la fecha límite
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

// 2. OBTENER EVALUACIÓN PÚBLICA (Barajada y con validación de tiempo)
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
              select: { id_opcion: true, texto: true }, // Solo texto e ID
            },
          },
        },
      },
    });

    if (!evaluacion)
      return res.status(404).json({ error: "Evaluación no encontrada" });

    // 🔴 BLOQUEO MANUAL (Switch)
    if (!evaluacion.estado)
      return res
        .status(400)
        .json({ error: "El examen ha sido cerrado por el instructor." });

    // 🔴 BLOQUEO POR TIEMPO
    if (
      evaluacion.fecha_cierre &&
      new Date() > new Date(evaluacion.fecha_cierre)
    ) {
      return res
        .status(400)
        .json({ error: "El tiempo para responder este examen ha terminado." });
    }

    // 🔀 ALEATORIEDAD (RANDOM)
    // Clonamos el objeto para no afectar la cache de prisma (aunque aquí no aplicaría cache, es buena práctica)
    const evaluacionRandom = { ...evaluacion };

    // Barajar Preguntas
    evaluacionRandom.preguntas = shuffleArray(evaluacionRandom.preguntas);

    // Barajar Opciones dentro de cada pregunta
    evaluacionRandom.preguntas.forEach((p) => {
      p.opciones = shuffleArray(p.opciones);
    });

    res.json(evaluacionRandom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar examen" });
  }
};

// 3. REGISTRAR INTENTO (Nota Base 20 + Anti-Duplicados)
const registrarIntento = async (req, res) => {
  try {
    const { id_evaluacion, dni, nombre, respuestas } = req.body;

    // VALIDACIÓN ANTI-DUPLICADOS
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

    // Base 20
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
    console.error(error);
    res.status(500).json({ error: "Error al calificar" });
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

// 6. EDITAR EVALUACIÓN
// 6. EDITAR EVALUACIÓN (Con actualización de Tiempo)
const editarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, titulo, preguntas, minutos_duracion } = req.body;

    // 1. Preparamos los datos básicos
    let datosActualizar = { tipo, titulo };

    // 2. 🟢 Lógica de Tiempo en Edición:
    // Si el usuario escribió un número en "minutos", recalculamos la fecha de cierre.
    if (minutos_duracion !== undefined && minutos_duracion !== "") {
      const min = parseInt(minutos_duracion);
      if (min > 0) {
        // Seteamos fecha de cierre: AHORA + MINUTOS
        const nuevaFecha = new Date();
        nuevaFecha.setMinutes(nuevaFecha.getMinutes() + min);
        datosActualizar.fecha_cierre = nuevaFecha;
      } else if (min === 0) {
        // Si pone 0, quitamos el límite de tiempo (Examen infinito)
        datosActualizar.fecha_cierre = null;
      }
    }

    await prisma.$transaction(async (tx) => {
      // Actualizamos cabecera (incluyendo fecha si cambió)
      await tx.evaluacion.update({
        where: { id_evaluacion: parseInt(id) },
        data: datosActualizar,
      });

      // Borramos y recreamos preguntas (Tu lógica original)
      await tx.pregunta.deleteMany({ where: { id_evaluacion: parseInt(id) } });

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

// 8. CAMBIAR ESTADO (TOGGLE)
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
