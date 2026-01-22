// backend/src/controllers/capacitacion.controller.js
const prisma = require("../utils/db");
const ExcelJS = require("exceljs");
const cloudinary = require("../config/cloudinary");
const path = require("path");
const fs = require("fs");

// ==========================================
// 🛠️ FUNCIONES AUXILIARES
// ==========================================

// 1. Limpiar Datos "Basura" del FormData ("null", "undefined", "")
const limpiarDato = (valor) => {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor === "string") {
    const v = valor.trim();
    if (v === "" || v === "null" || v === "undefined") return undefined;
    return v;
  }
  return valor;
};

// 2. Normalizar texto (para búsquedas)
const normalizar = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const registrarAsistencia = async (req, res) => {
  try {
    const { trabajadorId, capacitacionId, firma } = req.body;

    const asistencia = await prisma.asistencia.create({
      data: {
        trabajadorId,
        capacitacionId,
        firma,
      },
    });

    res.json(asistencia);
  } catch (error) {
    res.status(500).json({ error: "Error registrando asistencia" });
  }
};

// 3. Procesar Hora (HH:mm -> Date)
const procesarHora = (horaStr) => {
  if (!horaStr || horaStr === "null" || horaStr === "undefined")
    return undefined;
  if (horaStr.includes("T")) return new Date(horaStr);

  const [hh, mm] = horaStr.split(":");
  const fechaBase = new Date();
  fechaBase.setHours(hh, mm, 0, 0);
  return fechaBase;
};

// 4. Subir imagen a Cloudinary (Devuelve undefined si no hay archivo)
const subirSiExiste = async (req, campo) => {
  if (req.files && req.files[campo] && req.files[campo][0]) {
    console.log(`☁️ Subiendo nueva imagen: ${campo}...`);
    try {
      const result = await cloudinary.uploader.upload(
        req.files[campo][0].path,
        { folder: "capacitaciones" },
      );
      return result.secure_url;
    } catch (uploadError) {
      console.error(`⚠️ Error subiendo ${campo}:`, uploadError);
      return undefined;
    }
  }
  return undefined;
};

// ==========================================
// 🎮 CONTROLADORES
// ==========================================

const crearCapacitacion = async (req, res) => {
  try {
    // 🟢 PASO 1: Extraemos 'evidencias' aquí para que NO se meta en '...resto'
    // Esto evita que Prisma intente buscar una columna 'evidencias' que no existe.
    const { participantes, institucion_procedencia, evidencias, ...resto } =
      req.body;

    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: "No autenticado" });

    // 🟢 PASO 2: Procesar archivos (Firma y Evidencias)
    const fotosParaGuardar = [];
    let urlFirmaFinal = resto.expositor_firma || "";

    if (req.files) {
      // A. Subir Evidencias (Galería) a la tabla 'documentos'
      if (req.files["evidencias"]) {
        for (const file of req.files["evidencias"]) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "capacitaciones",
          });
          fotosParaGuardar.push({
            url: result.secure_url,
            tipo: "EVIDENCIA_FOTO", // Concuerda con tu modelo
            nombre_archivo: file.originalname,
          });
        }
      }

      // B. Subir Firma
      const firmaFile = req.files["expositor_firma"]
        ? req.files["expositor_firma"][0]
        : null;
      if (firmaFile) {
        const resultF = await cloudinary.uploader.upload(firmaFile.path, {
          folder: "firmas",
        });
        urlFirmaFinal = resultF.secure_url;
      }
    }
    // 🟢 3. PARSEAR PARTICIPANTES

    let listaParticipantes = [];

    try {
      listaParticipantes =
        typeof participantes === "string"
          ? JSON.parse(participantes)
          : participantes || [];
    } catch (e) {
      listaParticipantes = [];
    }

    // 🟢 PASO 3: Guardar en Prisma
    const nueva = await prisma.capacitaciones.create({
      data: {
        ...resto,
        institucion_procedencia: institucion_procedencia || null,
        expositor_firma: String(urlFirmaFinal),

        // Formateo de campos obligatorios
        fecha: resto.fecha ? new Date(resto.fecha) : undefined,
        hora_inicio: resto.hora_inicio
          ? procesarHora(resto.hora_inicio)
          : undefined,
        hora_termino: resto.hora_termino
          ? procesarHora(resto.hora_termino)
          : undefined,

        total_hombres: Number(resto.total_hombres) || 0,
        total_mujeres: Number(resto.total_mujeres) || 0,
        total_trabajadores: Number(resto.total_trabajadores) || 0,

        // Relación con Usuario
        usuarios: { connect: { id_usuario: Number(usuarioId) } },

        // 🟢 RELACIÓN CON DOCUMENTOS (Tu modelo documentos)
        documentos: {
          create: fotosParaGuardar,
        },

        participantes: {
          create: listaParticipantes.map((p, i) => ({
            numero: i + 1,
            dni: p.dni,
            apellidos_nombres: p.apellidos_nombres,
            area: p.area,
            cargo: p.cargo,
            genero: p.genero || "M",
            firma_url: p.firma_url || null,
          })),
        },
      },
      include: { participantes: true, documentos: true },
    });

    res.status(201).json({ mensaje: "Registrado con éxito", data: nueva });
  } catch (error) {
    console.error("🔥 Error Final:", error);
    res.status(500).json({ error: "Error al guardar", detalle: error.message });
  }
};

// --- 2. OBTENER TODAS ---
const obtenerCapacitaciones = async (req, res) => {
  try {
    const { id_usuario, rol } = req.user;
    // Filtro: Administradores y Auditores ven todo, usuarios normales solo lo suyo
    const filtro =
      rol === "Administrador" || rol === "Auditor"
        ? {}
        : { creado_por: id_usuario };

    const caps = await prisma.capacitaciones.findMany({
      where: filtro,
      orderBy: { fecha: "desc" },
      include: {
        usuarios: { select: { nombre: true } },
        documentos: { select: { id_documento: true, url: true, tipo: true } },
      },
    });

    // Mapeamos la respuesta para que el frontend vea "institucion_procedencia"
    const formateadas = caps.map((c) => ({
      ...c,
      institucion_procedencia: c.institucion_procedencia, // 🟢 Clave para que el frontend no falle
    }));

    res.json(formateadas);
  } catch (error) {
    console.error("Error al listar:", error);
    res.status(500).json({ error: "Error al listar las capacitaciones" });
  }
};

// --- 3. OBTENER DETALLE DE CAPACITACIÓN ---
const obtenerCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;

    const capacitacion = await prisma.capacitaciones.findUnique({
      where: { id_capacitacion: Number(id) },
      include: {
        participantes: true,
        documentos: true,
      },
    });

    if (!capacitacion) {
      return res.status(404).json({ error: "No encontrado" });
    }

    // 🧠 Normalizador (tildes + mayúsculas)
    const normalizar = (str = "") =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    // 🎯 Áreas objetivo
    let areasParaBuscar = [];
    if (capacitacion.area_objetivo) {
      areasParaBuscar = capacitacion.area_objetivo
        .split(",")
        .map((a) => normalizar(a));
    }

    let faltantes = [];
    let porcentaje = 0;
    let totalObjetivo = 0;
    let totalAsistentes = 0;

    if (areasParaBuscar.length > 0) {
      // 👷‍♂️ Todos los trabajadores activos
      const todosTrabajadores = await prisma.trabajadores.findMany({
        where: { estado: true },
        select: {
          dni: true,
          nombres: true,
          apellidos: true,
          area: true,
          cargo: true,
        },
      });

      // ✅ Trabajadores que pertenecen al área objetivo
      let trabajadoresObjetivo = todosTrabajadores.filter((t) => {
        const areaT = normalizar(t.area);

        return areasParaBuscar.some((areaCap) => {
          const areaCapNorm = normalizar(areaCap);

          // 🟢 Lógica de Mantenimiento / Taller (Unificada)
          // Si el plan pide "Mantenimiento", buscamos a los de "Taller - Mecanización" y viceversa
          if (
            areaCapNorm.includes("mantenimiento") ||
            areaCapNorm.includes("taller") ||
            areaCapNorm.includes("mecanizacion")
          ) {
            return (
              areaT.includes("mantenimiento") ||
              areaT.includes("taller") ||
              areaT.includes("mecanizacion")
            );
          }

          // 🔵 Lógica estándar para las demás áreas
          return areaT.includes(areaCapNorm);
        });
      });

      // 🎯 DNIs del objetivo
      const dnisObjetivo = new Set(
        trabajadoresObjetivo.map((t) => t.dni?.trim()),
      );

      // ✅ Asistentes que SÍ pertenecen al área objetivo
      const asistentesValidos = capacitacion.participantes.filter((p) =>
        dnisObjetivo.has(p.dni?.trim()),
      );

      const asistentesDNI = new Set(
        asistentesValidos.map((p) => p.dni?.trim()),
      );

      // ❌ Faltantes reales
      faltantes = trabajadoresObjetivo.filter(
        (t) => !asistentesDNI.has(t.dni?.trim()),
      );

      totalObjetivo = trabajadoresObjetivo.length;
      totalAsistentes = asistentesDNI.size;

      porcentaje =
        totalObjetivo > 0
          ? Math.round((totalAsistentes / totalObjetivo) * 100)
          : 0;
    }

    res.json({
      ...capacitacion,
      institucion_procedencia: capacitacion.institucion_procedencia,
      faltantes,
      cobertura: {
        total_objetivo: totalObjetivo,
        asistentes: totalAsistentes,
        porcentaje,
      },
    });
  } catch (error) {
    console.error("Error al obtener detalle:", error);
    res.status(500).json({ error: "Error al obtener el detalle" });
  }
};

// --- 4. ACTUALIZAR (PUT) --- 🛡️ VERSIÓN GALERÍA BLINDADA
const actualizarCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Usamos 'let' para permitir el parseo de participantes si vienen por FormData
    let { participantes, institucion_procedencia, evidencias, ...resto } =
      req.body;

    // Convertir participantes a Array si es necesario
    const listaParticipantes =
      typeof participantes === "string"
        ? JSON.parse(participantes)
        : participantes;

    // 2. Procesar Imágenes (Firma Expositor y Evidencias)
    let urlFirmaUpdate = resto.expositor_firma;
    const nuevasFotos = [];

    if (req.files) {
      // Firma nueva del expositor
      if (req.files["expositor_firma"]) {
        const f = req.files["expositor_firma"][0];
        const resFirma = await cloudinary.uploader.upload(f.path, {
          folder: "firmas",
        });
        urlFirmaUpdate = resFirma.secure_url;
      }

      // Evidencias nuevas
      const evidenciasFiles = req.files["evidencias"] || [];
      for (const file of evidenciasFiles) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "capacitaciones",
        });
        nuevasFotos.push({
          url: result.secure_url,
          tipo: "EVIDENCIA_FOTO",
          nombre_archivo: file.originalname,
        });
      }
    }

    const participantesConFirma = await prisma.participantes.findMany({
      where: {
        id_capacitacion: Number(id),
        firma_url: { not: null },
      },
      select: {
        dni: true,
        firma_url: true,
      },
    });
    for (const p of participantesConFirma) {
      await prisma.trabajadores.updateMany({
        where: { dni: p.dni.trim() },
        data: { firma_url: p.firma_url },
      });
    }

    // 🟢 LIMPIEZA DE DATOS: Evitamos enviar campos que NO existen en Prisma
    const {
      id_capacitacion,
      creado_por,
      fecha_registro,
      documentos,
      faltantes,
      cobertura, // 🔥 CLAVE: eliminar cobertura
      ...datosLimpios
    } = resto;

    delete datosLimpios.cobertura;
    delete datosLimpios.faltantes;

    // 3. Actualización Principal de la Capacitación
    await prisma.participantes.deleteMany({
      where: {
        id_capacitacion: Number(id),
      },
    });
    const capacitacionActualizada = await prisma.capacitaciones.update({
      where: { id_capacitacion: Number(id) },
      data: {
        ...datosLimpios,
        institucion_procedencia: institucion_procedencia || null,
        ...(urlFirmaUpdate ? { expositor_firma: urlFirmaUpdate } : {}),

        // Forzar formatos correctos para campos de fecha y hora
        fecha: resto.fecha ? new Date(resto.fecha) : undefined,
        hora_inicio: resto.hora_inicio
          ? procesarHora(resto.hora_inicio)
          : undefined,
        hora_termino: resto.hora_termino
          ? procesarHora(resto.hora_termino)
          : undefined,

        // Totales
        total_hombres: Number(resto.total_hombres) || 0,
        total_mujeres: Number(resto.total_mujeres) || 0,
        total_trabajadores: Number(resto.total_trabajadores) || 0,

        // Relación con fotos nuevas enviadas en este request
        documentos: {
          create: nuevasFotos,
        },
      },
    });

    if (listaParticipantes?.length) {
      await prisma.participantes.createMany({
        data: listaParticipantes.map((p, index) => ({
          id_capacitacion: Number(id),
          numero: index + 1,
          dni: p.dni,
          apellidos_nombres: p.apellidos_nombres,
          area: p.area,
          cargo: p.cargo,
          genero: p.genero || "M",
          firma_url: p.firma_url || null,
          condicion: p.condicion || null,
        })),
      });
    }

    // 4. Sincronización Maestra: subir firmas y actualizar trabajadores
    if (listaParticipantes && Array.isArray(listaParticipantes)) {
      for (const p of listaParticipantes) {
        // 🟢 Caso 1: firma dibujada (base64)
        if (p.firma_base64 && p.firma_base64.startsWith("data:image")) {
          const uploadResult = await cloudinary.uploader.upload(
            p.firma_base64,
            {
              folder: "firmas_trabajadores",
              resource_type: "image",
            },
          );

          const firmaUrl = uploadResult.secure_url;

          // 🔹 Actualizar firma en participantes
          await prisma.participantes.updateMany({
            where: {
              dni: p.dni,
              id_capacitacion: Number(id),
            },
            data: {
              firma_url: firmaUrl,
            },
          });

          // 🔹 Actualizar firma en maestro_trabajadores
          await prisma.trabajadores.updateMany({
            where: { dni: p.dni.trim() },
            data: { firma_url: firmaUrl },
          });
        }

        // 🟢 Caso 2: firma ya existente (subida manualmente)
        else if (p.firma_url && p.dni) {
          await prisma.trabajadores.updateMany({
            where: { dni: p.dni.trim() },
            data: { firma_url: p.firma_url },
          });
        }
      }
    }

    // 5. Respuesta Exitosa
    res.json({
      mensaje: "Capacitación y firmas de trabajadores actualizadas con éxito",
      data: capacitacionActualizada,
    });
  } catch (error) {
    console.error("Error crítico en el controlador:", error);
    res.status(500).json({
      error: "Error interno al procesar la actualización",
      detalle: error.message,
    });
  }
};

// --- NUEVO: Eliminar una foto específica de la galería ---
const eliminarDocumento = async (req, res) => {
  const { idDoc } = req.params;
  try {
    await prisma.documentos.delete({
      where: { id_documento: Number(idDoc) },
    });
    console.log(`🗑️ Documento ${idDoc} eliminado físicamente de la DB`);
    res.json({ mensaje: "Foto eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar foto:", error);
    res
      .status(500)
      .json({ error: "No se pudo eliminar la foto de la galería" });
  }
};

// --- 5. ELIMINAR ---
const eliminarCapacitacion = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.participantes.deleteMany({
      where: { id_capacitacion: Number(id) },
    });
    await prisma.capacitaciones.delete({
      where: { id_capacitacion: Number(id) },
    });
    res.json({ mensaje: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
};

// --- 6. EXPORTAR EXCEL ---
const exportarExcel = async (req, res) => {
  try {
    console.log("--> Generando Excel...");
    const empresa = await prisma.empresa.findFirst();
    const capacitaciones = await prisma.capacitaciones.findMany({
      include: { participantes: true },
      orderBy: { fecha: "desc" },
    });

    if (capacitaciones.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay capacitaciones para exportar" });
    }

    const logoPath = path.join(process.cwd(), "templates", "logo.png");
    let logoId = null;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema SST";
    workbook.created = new Date();

    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoId = workbook.addImage({
        buffer: logoBuffer,
        extension: "png",
      });
    }

    capacitaciones.forEach((cap) => {
      let sheetName = cap.codigo_acta || `CAP-${cap.id_capacitacion}`;
      sheetName = sheetName.replace(/[\\/?*[\]]/g, "_").substring(0, 30);
      const sheet = workbook.addWorksheet(sheetName);

      if (logoId !== null) {
        sheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 80 },
        });
      }

      const direccionSede =
        cap.sede_empresa === "Olmos"
          ? empresa?.direccion_olmos || "Sede Olmos"
          : empresa?.direccion_majes || "Sede Majes";

      sheet.mergeCells("C1:F1");
      const titleCell = sheet.getCell("C1");
      titleCell.value = empresa?.nombre || "EMPRESA";
      titleCell.font = { name: "Arial", size: 14, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.mergeCells("C2:F2");
      const subtitleCell = sheet.getCell("C2");
      subtitleCell.value = `ACTA - ${cap.codigo_acta}`;
      subtitleCell.font = {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FF0000FF" },
      };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.mergeCells("C3:F3");
      const dirCell = sheet.getCell("C3");
      dirCell.value = direccionSede;
      dirCell.font = { size: 9, italic: true };
      dirCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.getRow(1).height = 20;
      sheet.getRow(2).height = 20;
      sheet.getRow(3).height = 20;

      sheet.getCell("A5").value = "TEMA:";
      sheet.getCell("B5").value = cap.tema_principal;
      sheet.getCell("A5").font = { bold: true };

      sheet.getCell("A6").value = "FECHA:";
      sheet.getCell("B6").value = new Date(cap.fecha).toLocaleDateString();
      sheet.getCell("C6").value = "HORARIO:";
      sheet.getCell("D6").value = `${
        cap.hora_inicio ? cap.hora_inicio.toISOString().substring(11, 16) : ""
      } - ${
        cap.hora_termino ? cap.hora_termino.toISOString().substring(11, 16) : ""
      }`;
      sheet.getCell("A6").font = { bold: true };
      sheet.getCell("C6").font = { bold: true };

      sheet.getCell("A7").value = "EXPOSITOR:";
      sheet.getCell("B7").value = cap.expositor_nombre;
      sheet.getCell("C7").value = "DNI:";
      sheet.getCell("D7").value = cap.expositor_dni;
      sheet.getCell("A7").font = { bold: true };
      sheet.getCell("C7").font = { bold: true };

      sheet.getCell("A8").value = "SEDE:";
      sheet.getCell("B8").value = cap.sede_empresa;
      sheet.getCell("C8").value = "AREA:";
      sheet.getCell("D8").value = cap.centros;
      sheet.getCell("A8").font = { bold: true };
      sheet.getCell("C8").font = { bold: true };

      sheet.addRow([]);

      const headerRow = sheet.addRow([
        "N°",
        "DNI",
        "APELLIDOS Y NOMBRES",
        "ÁREA",
        "CARGO",
        "FIRMA",
      ]);

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2980B9" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      if (cap.participantes && cap.participantes.length > 0) {
        cap.participantes.forEach((p, index) => {
          const row = sheet.addRow([
            index + 1,
            p.dni,
            p.apellidos_nombres,
            p.area,
            p.cargo,
            "",
          ]);
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", wrapText: true };
          });
        });
      } else {
        sheet.addRow(["", "Sin participantes..."]);
      }

      sheet.addRow([]);
      const totalRow = sheet.addRow([
        "",
        "",
        "TOTAL ASISTENTES:",
        cap.total_trabajadores || 0,
      ]);
      totalRow.getCell(3).font = { bold: true };
      totalRow.getCell(4).font = { bold: true, color: { argb: "FFFF0000" } };

      sheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          if (cell.row > 4) {
            const columnLength = cell.value ? cell.value.toString().length : 0;
            if (columnLength > maxLength) maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 4;
      });
      sheet.getColumn(1).width = 15;
      sheet.getColumn(6).width = 20;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Reporte_Actas_Completo.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando excel:", error);
    res.status(500).json({ error: "Error al generar el Excel" });
  }
};

// --- 7. DETALLE CUMPLIMIENTO ---
const obtenerDetalleCumplimiento = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Buscar Capacitación
    const capacitacion = await prisma.capacitaciones.findUnique({
      where: { id_capacitacion: parseInt(id) },
      include: { participantes: true },
    });

    if (!capacitacion) return res.status(404).json({ error: "No encontrado" });

    // 2. Buscar coincidencias en el Plan Anual
    const planes = await prisma.planAnual.findMany();
    const temaCap = normalizar(capacitacion.tema_principal);

    const coincidenciasPlan = planes.filter((p) => {
      const temaPlan = normalizar(p.tema);
      return temaPlan.includes(temaCap) || temaCap.includes(temaPlan);
    });

    // 3. Determinar Meta ÚNICA (Trabajadores Objetivo)
    const trabajadoresObjetivoMap = new Map();
    let areasObjetivoSet = new Set();

    if (coincidenciasPlan.length > 0) {
      coincidenciasPlan.forEach((p) => {
        if (p.areas_objetivo) {
          p.areas_objetivo
            .split(",")
            .forEach((a) => areasObjetivoSet.add(a.trim()));
        }
      });

      const areasNorm = Array.from(areasObjetivoSet).map((a) => normalizar(a));
      const todosTrabajadores = await prisma.trabajadores.findMany({
        where: { estado: true },
      });

      todosTrabajadores.forEach((t) => {
        const areaT = normalizar(t.area);
        if (areasNorm.some((areaPlan) => areaT.includes(areaPlan))) {
          trabajadoresObjetivoMap.set(t.dni, t);
        }
      });
    }

    const trabajadoresObjetivo = Array.from(trabajadoresObjetivoMap.values());

    // 4. Determinar Asistentes ÚNICOS
    const dnisAsistentes = new Set();
    capacitacion.participantes.forEach((p) => {
      if (p.dni) dnisAsistentes.add(p.dni);
    });

    // 5. Cálculos Finales
    const meta = trabajadoresObjetivo.length;
    const asistentesValidos = trabajadoresObjetivo.filter((t) =>
      dnisAsistentes.has(t.dni),
    ).length;

    const faltantes = trabajadoresObjetivo.filter(
      (t) => !dnisAsistentes.has(t.dni),
    );

    const cobertura =
      meta > 0 ? ((asistentesValidos / meta) * 100).toFixed(1) : 0;

    res.json({
      capacitacion: {
        tema: capacitacion.tema_principal,
        fecha: capacitacion.fecha,
        sede: capacitacion.sede_empresa,
        expositor: capacitacion.expositor_nombre,
      },
      areas_involucradas: Array.from(areasObjetivoSet),
      estadisticas: {
        meta_total: meta,
        asistentes_totales: dnisAsistentes.size,
        asistentes_validos: asistentesValidos,
        cobertura_porcentaje: Number(cobertura),
      },
      faltantes: faltantes.map((t) => ({
        dni: t.dni,
        nombres: t.nombres,
        apellidos: t.apellidos,
        area: t.area,
        cargo: t.cargo,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error calculando detalle" });
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
