const prisma = require("../utils/db");
const CapacitacionService = require("../services/capacitacion.service");
const FileService = require("../services/file.service");
const ExcelService = require("../services/excel.service");
const { procesarHora, normalizar } = require("../utils/formatters");

/**
 * CONTROLADOR DE CAPACITACIONES
 * Delegamos la lógica pesada a los Services para mantener los controladores limpios.
 */

const crearCapacitacion = async (req, res) => {
  try {
    const { participantes, institucion_procedencia, ...resto } = req.body;
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: "No autenticado" });

    const folder = `sistema_capacitaciones/temp_${Date.now()}`;

    // 1. Procesar archivos
    const fotosEvidencia = await FileService.uploadMultiple(req.files["evidencias"], `${folder}/evidencias`);
    const urlFirmaExpositor = await FileService.uploadSingle(req.files["expositor_firma"]?.[0], `${folder}/firma_expositor`);

    // 2. Formatear datos para el servicio
    const payload = {
      ...resto,
      institucion_procedencia: institucion_procedencia || null,
      expositor_firma: urlFirmaExpositor || resto.expositor_firma || "",
      fecha: resto.fecha ? new Date(resto.fecha) : undefined,
      hora_inicio: procesarHora(resto.hora_inicio),
      hora_termino: procesarHora(resto.hora_termino),
      total_hombres: Number(resto.total_hombres) || 0,
      total_mujeres: Number(resto.total_mujeres) || 0,
      total_trabajadores: Number(resto.total_trabajadores) || 0,
      documentos: fotosEvidencia,
      participantes: typeof participantes === "string" ? JSON.parse(participantes) : participantes || [],
    };

    const nueva = await CapacitacionService.create(payload, usuarioId);
    try {
      await prisma.notificacion.create({
        data: {
          mensaje: `Se ha registrado una nueva capacitación: "${nueva.tema_principal || "Tema no especificado"}"`,
          tipo: "CAPACITACION",
          url_destino: `/dashboard/capacitaciones/${nueva.id_capacitacion}`, // 🟢 Cambiado a nueva.id
        },
      });
    } catch (errorNotificacion) {
      console.error("Error al generar la notificación:", errorNotificacion);
    }
    res.status(201).json({ mensaje: "Registrado con éxito", data: nueva });
  } catch (error) {
    FileService.clearLocalFiles(req.files);
    console.error("🔥 Error en crearCapacitacion:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "El código de acta ya está registrado" });
    }
    res.status(500).json({ error: "Error al guardar", detalle: error.message });
  }
};

const obtenerCapacitaciones = async (req, res) => {
  try {
    const id_auth = req.user?.id_usuario || req.user?.id || -1;
    const rol_auth = req.user?.rol;
    const data = await CapacitacionService.getAll(id_auth, rol_auth);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al listar las capacitaciones" });
  }
};

const obtenerCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await CapacitacionService.getById(id);
    if (!data) return res.status(404).json({ error: "No encontrado" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el detalle" });
  }
};

const actualizarCapacitacion = async (req, res) => {
  const { id } = req.params;
  try {
    const { participantes, institucion_procedencia, ...resto } = req.body;
    const folder = `sistema_capacitaciones/cap_${id}`;

    // 1. Procesar nuevos archivos
    const nuevasFotos = await FileService.uploadMultiple(req.files?.["evidencias"], `${folder}/evidencias`);
    const nuevaFirma = await FileService.uploadSingle(req.files?.["expositor_firma"]?.[0], `${folder}/firma_expositor`);

    // 2. Preparar payload
    const payload = {
      ...resto,
      institucion_procedencia: institucion_procedencia || null,
      ...(nuevaFirma ? { expositor_firma: nuevaFirma } : {}),
      fecha: resto.fecha ? new Date(resto.fecha) : undefined,
      hora_inicio: procesarHora(resto.hora_inicio),
      hora_termino: procesarHora(resto.hora_termino),
      total_hombres: Number(resto.total_hombres) || 0,
      total_mujeres: Number(resto.total_mujeres) || 0,
      total_trabajadores: Number(resto.total_trabajadores) || 0,
      nuevosDocumentos: nuevasFotos,
      participantes: typeof participantes === "string" ? JSON.parse(participantes) : participantes || [],
    };

    // Limpieza de campos internos de Prisma/Calculados
    const camposABorrar = ['id_capacitacion', 'creado_por', 'fecha_registro', 'documentos', 'faltantes', 'cobertura'];
    camposABorrar.forEach(key => delete payload[key]);

    const actualizada = await CapacitacionService.update(id, payload);
    res.json({ mensaje: "Capacitación actualizada correctamente", data: actualizada });
  } catch (error) {
    FileService.clearLocalFiles(req.files);
    console.error("🔥 Error en actualizarCapacitacion:", error);
    res.status(500).json({ error: "Error interno al procesar la actualización" });
  }
};

const eliminarCapacitacion = async (req, res) => {
  try {
    await CapacitacionService.delete(req.params.id);
    res.json({ mensaje: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const empresa = await prisma.empresa.findFirst();
    const capacitaciones = await prisma.capacitaciones.findMany({
      include: { participantes: true },
      orderBy: { fecha: "desc" },
    });

    if (capacitaciones.length === 0) return res.status(404).json({ error: "No hay datos" });

    const workbook = await ExcelService.generateTrainingReport(capacitaciones, empresa);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Reporte_Actas.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error Excel:", error);
    res.status(500).json({ error: "Error al generar Excel" });
  }
};

const eliminarDocumento = async (req, res) => {
  try {
    await CapacitacionService.deleteDocument(req.params.idDoc);
    res.json({ mensaje: "Foto eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar la foto" });
  }
};

const registrarAsistencia = async (req, res) => {
  try {
    const { trabajadorId, capacitacionId, firma } = req.body;
    const asistencia = await prisma.asistencia.create({
      data: { trabajadorId, capacitacionId, firma },
    });
    res.json(asistencia);
  } catch (error) {
    res.status(500).json({ error: "Error registrando asistencia" });
  }
};

const obtenerDetalleCumplimiento = async (req, res) => {
  // Se mantiene similar pero podría moverse a un AnalyticsService a futuro
  const { id } = req.params;
  try {
    const capacitacion = await prisma.capacitaciones.findUnique({
      where: { id_capacitacion: parseInt(id) },
      include: { participantes: true },
    });
    if (!capacitacion) return res.status(404).json({ error: "No encontrado" });

    const planes = await prisma.planAnual.findMany();
    const temaCap = normalizar(capacitacion.tema_principal);
    const coincidencias = planes.filter(p => normalizar(p.tema).includes(temaCap));

    // Cálculos reducidos para el ejemplo
    res.json({
      capacitacion: { tema: capacitacion.tema_principal, fecha: capacitacion.fecha },
      coincidencias_plan: coincidencias.length,
      asistentes: capacitacion.participantes.length
    });
  } catch (error) {
    res.status(500).json({ error: "Error calculando cumplimiento" });
  }
};

module.exports = {
  crearCapacitacion,
  obtenerCapacitaciones,
  obtenerCapacitacion,
  actualizarCapacitacion,
  eliminarCapacitacion,
  exportarExcel,
  obtenerDetalleCumplimiento,
  eliminarDocumento,
  registrarAsistencia,
};
