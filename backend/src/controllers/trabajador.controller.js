// backend/src/controllers/trabajador.controller.js

const prisma = require("../utils/db");
const path = require("path");

// 1. LISTAR TODOS
const obtenerTrabajadores = async (req, res) => {
  try {
    // CORRECCIÓN: Ordenamos por apellidos y luego nombres, ya que el campo unificado no existe
    const trabajadores = await prisma.trabajadores.findMany({
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    });
    res.json(trabajadores);
  } catch (error) {
    console.error("Error al listar:", error);
    res.status(500).json({ error: "Error al listar trabajadores" });
  }
};

const getTrabajadoresSelect = async (req, res) => {
  try {
    const trabajadores = await prisma.trabajadores.findMany({
      where: { estado: true },
      select: {
        dni: true,
        nombres: true,
        apellidos: true,
        area: true,
        cargo: true,
        genero: true,
        firma_url: true,
      },
      orderBy: { apellidos: "asc" },
    });
    res.json(trabajadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar trabajadores" });
  }
};

// 2. BUSCAR POR DNI
const buscarPorDNI = async (req, res) => {
  try {
    const { dni } = req.params;
    const trabajador = await prisma.trabajadores.findUnique({
      where: { dni },
    });
    if (!trabajador) return res.status(404).json({ error: "No encontrado" });
    res.json(trabajador);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar" });
  }
};

// 3. GUARDAR (CREAR O ACTUALIZAR)
const guardarTrabajador = async (req, res) => {
  try {
    // CORRECCIÓN IMPORTANTE:
    // Debes recibir 'nombres' y 'apellidos' por separado desde el Frontend.
    // Si tu frontend envía 'apellidos_nombres', tendrás que separarlo aquí manualmente.
    const { dni, nombres, apellidos, area, cargo, genero, firma_url } =
      req.body;

    // Validación simple para evitar guardar nulos si el frontend falla
    if (!nombres || !apellidos) {
      return res
        .status(400)
        .json({ error: "Se requieren nombres y apellidos por separado." });
    }

    const trabajador = await prisma.trabajadores.upsert({
      where: { dni },
      update: {
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url,
      },
      create: {
        dni,
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url,
      },
    });

    res.json(trabajador);
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ error: "Error al guardar trabajador" });
  }
};

// 4. ELIMINAR (Sin cambios, esto estaba bien)
const eliminarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.delete({
      where: { id_trabajador: Number(id) },
    });
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      error: "Error al eliminar. Puede tener capacitaciones asociadas.",
    });
  }
};

// 5. CARGA MASIVA DE FIRMAS (Prácticamente igual, solo verifica que use el modelo correcto)
const cargaMasivaFirmas = async (req, res) => {
  try {
    const archivos = req.files;

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ error: "No se enviaron archivos." });
    }

    let actualizados = 0;
    let errores = 0;

    for (const archivo of archivos) {
      try {
        const nombreOriginal = archivo.originalname;
        const dniExtraido = path.parse(nombreOriginal).name;

        if (/^\d{8}$/.test(dniExtraido)) {
          const urlPublica = `${req.protocol}://${req.get("host")}/uploads/${
            archivo.filename
          }`;

          const resultado = await prisma.trabajadores.updateMany({
            where: { dni: dniExtraido },
            data: { firma_url: urlPublica },
          });

          if (resultado.count > 0) {
            actualizados++;
          } else {
            errores++;
          }
        } else {
          errores++;
        }
      } catch (err) {
        errores++;
      }
    }

    res.json({
      mensaje: "Proceso masivo finalizado",
      total_procesados: archivos.length,
      actualizados_correctamente: actualizados,
      no_encontrados_o_error: errores,
    });
  } catch (error) {
    console.error("Error masivo:", error);
    res.status(500).json({ error: "Error en la carga masiva" });
  }
};

module.exports = {
  obtenerTrabajadores,
  buscarPorDNI,
  guardarTrabajador,
  eliminarTrabajador,
  cargaMasivaFirmas,
  getTrabajadoresSelect,
};
