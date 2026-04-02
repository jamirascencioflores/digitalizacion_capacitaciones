const prisma = require("../utils/db");
const CapacitacionService = require("../services/capacitacion.service");
const FileService = require("../services/file.service");
const ExcelService = require("../services/excel.service");
const { procesarHora, normalizar } = require("../utils/formatters");
const { uploadFromBuffer } = require("../utils/uploadToFirebase");

/**
 * CONTROLADOR DE CAPACITACIONES
 * Delegamos la lógica pesada a los Services para mantener los controladores limpios.
 */

const crearCapacitacion = async (req, res) => {
  try {
    const { participantes, institucion_procedencia, ...resto } = req.body;
    const usuarioId = req.user?.id || req.user?.id_usuario;
    const idEmpresa = req.user?.id_empresa || 1;

    if (!usuarioId) return res.status(401).json({ error: "No autenticado" });

    // 🟢 PASO 1: GUARDAR EN LA BASE DE DATOS PRIMERO (Solo texto)
    // Dejamos los documentos vacíos y la firma temporalmente en blanco
    const payload = {
      ...resto,
      institucion_procedencia: institucion_procedencia || null,
      expositor_firma: resto.expositor_firma || "",
      fecha: resto.fecha ? new Date(resto.fecha) : undefined,
      hora_inicio: procesarHora(resto.hora_inicio),
      hora_termino: procesarHora(resto.hora_termino),
      total_hombres: Number(resto.total_hombres) || 0,
      total_mujeres: Number(resto.total_mujeres) || 0,
      total_trabajadores: Number(resto.total_trabajadores) || 0,
      documentos: [], // Vacío por ahora
      participantes:
        typeof participantes === "string"
          ? JSON.parse(participantes)
          : participantes || [],
    };

    // ¡Aquí nace la capacitación! Si falla (ej. Acta duplicada), salta al Catch y no sube nada.
    const nueva = await CapacitacionService.create(
      payload,
      usuarioId,
      idEmpresa,
    );

    // 🟢 PASO 2: CAPTURAR ARCHIVOS YA SUBIDOS POR MULTER
    // Como Multer ya los subió, req.files ya tiene la información
    let urlFirma = null;
    let fotosEvidencia = [];

    // 2.1 Subir Firma desde la RAM (Ahora en la ruta de la capacitación)
    if (req.files && req.files["expositor_firma"]) {
      const firmaFile = req.files["expositor_firma"][0];

      // 🟢 Ruta corregida: Ahora cuelga de la carpeta de la capacitación específica
      const folderFirmas = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${nueva.id_capacitacion}/firma_expositor`;

      const resultadoFirma = await uploadFromBuffer(
        firmaFile.buffer,
        folderFirmas,
        firmaFile.originalname,
      );
      urlFirma = resultadoFirma.secure_url;
    }

    // 2.2 Subir Evidencias desde la RAM
    if (req.files && req.files["evidencias"]) {
      const folderCapacitacion = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${nueva.id_capacitacion}/evidencias`;

      // Como pueden ser varias fotos, iteramos y subimos una por una
      for (const file of req.files["evidencias"]) {
        const resultadoFoto = await uploadFromBuffer(
          file.buffer, // 🟢 Archivo de la RAM
          folderCapacitacion,
          file.originalname,
        );
        fotosEvidencia.push({ secure_url: resultadoFoto.secure_url });
      }
    }

    // 2.3 Subir firmas de participantes desde la RAM
    if (req.files && req.files["firmas_participantes"]) {
      // Usamos el ID de la capacitación que acaba de nacer
      const folderFirmasPart = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${nueva.id_capacitacion}/firmas_participantes`;
      const actualizaciones = [];

      for (const file of req.files["firmas_participantes"]) {
        // 🟢 file.originalname viene como "0_firma_trab_123.webp".
        // Extraemos el índice (0) y el nombre real de la firma
        const partes = file.originalname.split("_");
        const indexFront = parseInt(partes[0], 10);
        const nombreReal = file.originalname.substring(partes[0].length + 1);

        // Subimos a Firebase
        const resFirma = await uploadFromBuffer(
          file.buffer,
          folderFirmasPart,
          nombreReal,
        );

        // Obtenemos el DNI del trabajador desde el payload usando el índice
        const dniParticipante = payload.participantes[indexFront].dni;

        // Actualizamos ESPECÍFICAMENTE a este participante en la base de datos
        actualizaciones.push(
          prisma.participantes.updateMany({
            where: {
              id_capacitacion: nueva.id_capacitacion,
              dni: dniParticipante,
            },
            data: { firma_url: resFirma.secure_url },
          }),
        );
      }

      // Ejecutamos todos los updates a la vez
      await Promise.all(actualizaciones);
    }

    // 🟢 PASO 3: ACTUALIZAR LA BD CON LAS URLs
    if (urlFirma || fotosEvidencia.length > 0) {
      if (urlFirma) {
        await prisma.capacitaciones.update({
          where: { id_capacitacion: nueva.id_capacitacion },
          data: { expositor_firma: urlFirma },
        });
        nueva.expositor_firma = urlFirma;
      }

      if (fotosEvidencia.length > 0) {
        const documentosData = fotosEvidencia.map((evidencia) => ({
          id_capacitacion: nueva.id_capacitacion,
          url: evidencia.secure_url, // 🟢 Usamos directamente lo que nos devolvió Firebase
          tipo: "EVIDENCIA_FOTO",
        }));

        await prisma.documentos.createMany({
          data: documentosData,
        });

        nueva.documentos = documentosData;
      }
    }

    // 🟢 PASO 4: CREAR NOTIFICACIÓN AL DASHBOARD
    try {
      await prisma.notificacion.create({
        data: {
          id_empresa: idEmpresa,
          mensaje: `Se ha registrado una nueva capacitación: "${nueva.tema_principal || "Tema no especificado"}"`,
          tipo: "CAPACITACION",
          url_destino: `/dashboard/capacitaciones/${nueva.id_capacitacion}`,
        },
      });
    } catch (errorNotificacion) {
      console.error("Error al generar la notificación:", errorNotificacion);
    }

    res.status(201).json({ mensaje: "Registrado con éxito", data: nueva });
  } catch (error) {
    console.error("🔥 Error en crearCapacitacion:", error);

    // Si Prisma da error de validación (Ej: Código duplicado)
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "El código de acta ya está registrado" });
    }

    res.status(500).json({ error: "Error al guardar", detalle: error.message });
  }
};

const obtenerCapacitaciones = async (req, res) => {
  try {
    const id_auth = req.user?.id_usuario || req.user?.id || -1;
    const rol_auth = req.user?.rol;
    const id_empresa = req.user?.id_empresa;

    const data = await CapacitacionService.getAll(
      id_auth,
      rol_auth,
      id_empresa,
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al listar las capacitaciones" });
  }
};

const obtenerCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;

    // 🟢 ESCUDO: Si envían undefined o letras, lo rebotamos con un 400
    if (!id || id === "undefined" || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID de capacitación inválido" });
    }

    // 1. Obtenemos los datos desde tu servicio
    const data = await CapacitacionService.getById(id);

    if (!data) return res.status(404).json({ error: "No encontrado" });

    // 2. 🛡️ SEGURIDAD SAAS
    const isSoporte = String(req.user?.rol).toUpperCase() === "SOPORTE";
    if (!isSoporte && data.id_empresa !== req.user?.id_empresa) {
      return res.status(403).json({
        error: "Acceso denegado: Esta capacitación pertenece a otra empresa",
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en obtenerCapacitacion:", error);
    res
      .status(500)
      .json({ error: "Error al obtener el detalle de la capacitación" });
  }
};

const actualizarCapacitacion = async (req, res) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10); // Lo necesitamos como número para Prisma

  try {
    const { participantes, institucion_procedencia, ...resto } = req.body;
    const idEmpresa = req.user?.id_empresa || 1;

    let nuevasFotos = [];
    let nuevaFirma = null;

    // 1.1 Subir nuevas Evidencias
    if (req.files && req.files["evidencias"]) {
      const folderEvidencias = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${id}/evidencias`;
      for (const file of req.files["evidencias"]) {
        const resultado = await uploadFromBuffer(
          file.buffer,
          folderEvidencias,
          file.originalname,
        );
        nuevasFotos.push({ url: resultado.secure_url, tipo: "EVIDENCIA_FOTO" });
      }
    }

    // 1.2 Subir nueva Firma del Expositor
    if (req.files && req.files["expositor_firma"]) {
      const firmaFile = req.files["expositor_firma"][0];
      const folderFirma = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${id}/firma_expositor`;
      const resultadoFirma = await uploadFromBuffer(
        firmaFile.buffer,
        folderFirma,
        firmaFile.originalname,
      );
      nuevaFirma = resultadoFirma.secure_url;
    }

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
      participantes:
        typeof participantes === "string"
          ? JSON.parse(participantes)
          : participantes || [],
    };

    // 3. Limpieza
    const camposABorrar = [
      "id_capacitacion",
      "creado_por",
      "fecha_registro",
      "documentos",
      "faltantes",
      "cobertura",
      "id_empresa",
      "idEmpresa",
    ];
    camposABorrar.forEach((key) => delete payload[key]);

    // 🟢 4. Ejecutar actualización de datos (Acta y Participantes)
    // Esto asegura que la base de datos esté lista antes de poner las firmas.
    const actualizada = await CapacitacionService.update(id, payload);

    // 🟢 5. Subir firmas manuales de participantes a Firebase y actualizar BD
    if (req.files && req.files["firmas_participantes"]) {
      const folderFirmasPart = `empresas/empresa_${idEmpresa}/capacitaciones/cap_${id}/firmas_participantes`;
      const actualizaciones = [];

      for (const file of req.files["firmas_participantes"]) {
        const partes = file.originalname.split("_");
        const indexFront = parseInt(partes[0], 10);
        const nombreReal = file.originalname.substring(partes[0].length + 1);

        const resFirma = await uploadFromBuffer(
          file.buffer,
          folderFirmasPart,
          nombreReal,
        );
        const dniParticipante = payload.participantes[indexFront].dni;

        actualizaciones.push(
          prisma.participantes.updateMany({
            where: {
              id_capacitacion: idNum, // 🟢 Usamos el ID de la URL como número
              dni: dniParticipante,
            },
            data: { firma_url: resFirma.secure_url },
          }),
        );
      }
      await Promise.all(actualizaciones);
    }

    res.json({
      mensaje: "Capacitación actualizada correctamente",
      data: actualizada,
    });
  } catch (error) {
    console.error("🔥 Error en actualizarCapacitacion:", error);
    res
      .status(500)
      .json({
        error: "Error interno al procesar la actualización",
        detalle: error.message,
      });
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
    const id_empresa = req.user?.id_empresa || 1; // 🟢 NUEVO: Empresa del usuario

    const empresa = await prisma.empresa.findUnique({ where: { id_empresa } });
    const capacitaciones = await prisma.capacitaciones.findMany({
      where: req.user?.rol === "SOPORTE" ? {} : { id_empresa },
      include: { participantes: true },
      orderBy: { fecha: "desc" },
    });

    if (capacitaciones.length === 0)
      return res.status(404).json({ error: "No hay datos" });

    const workbook = await ExcelService.generateTrainingReport(
      capacitaciones,
      empresa,
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Reporte_Actas.xlsx",
    );
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
    const coincidencias = planes.filter((p) =>
      normalizar(p.tema).includes(temaCap),
    );

    // Cálculos reducidos para el ejemplo
    res.json({
      capacitacion: {
        tema: capacitacion.tema_principal,
        fecha: capacitacion.fecha,
      },
      coincidencias_plan: coincidencias.length,
      asistentes: capacitacion.participantes.length,
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
