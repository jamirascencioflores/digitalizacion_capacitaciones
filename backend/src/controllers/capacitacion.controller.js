// backend/src/controllers/capacitacion.controller.js
const prisma = require("../utils/db");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

// Función auxiliar para normalizar texto
const normalizar = (texto) => {
  return texto
    ? texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";
};

// --- HELPER PARA CALCULAR TOTALES EN BACKEND (INFALIBLE) ---
const calcularTotalesDesdeLista = (listaParticipantes) => {
  let hombres = 0;
  let mujeres = 0;

  if (!listaParticipantes || !Array.isArray(listaParticipantes)) {
    return { total_hombres: 0, total_mujeres: 0, total_trabajadores: 0 };
  }

  listaParticipantes.forEach((p) => {
    // Normalizamos el género para evitar errores (M, m, Masculino, Hombre)
    const genero = p.genero ? String(p.genero).toUpperCase().trim() : "M";

    if (["M", "MASCULINO", "HOMBRE"].includes(genero)) {
      hombres++;
    } else if (["F", "FEMENINO", "MUJER"].includes(genero)) {
      mujeres++;
    }
  });

  return {
    total_hombres: hombres,
    total_mujeres: mujeres,
    total_trabajadores: hombres + mujeres,
  };
};

// 🟢 NUEVO: HELPER PARA SINCRONIZAR FIRMAS AL MAESTRO AUTOMÁTICAMENTE
const sincronizarFirmasConMaestro = async (participantes) => {
  if (!participantes || !Array.isArray(participantes)) return;

  // Filtramos solo los que tienen DNI y alguna FIRMA (url o base64)
  const conFirma = participantes.filter(
    (p) => p.dni && (p.firma_url || p.firma)
  );

  // Ejecutamos en paralelo (sin await para no frenar la respuesta al usuario)
  conFirma.forEach(async (p) => {
    try {
      const firmaParaGuardar = p.firma_url || p.firma;
      // Buscamos si existe el trabajador en el MAESTRO y actualizamos su firma
      await prisma.trabajadores.update({
        where: { dni: p.dni },
        data: { firma_url: firmaParaGuardar },
      });
    } catch (e) {
      // Si el trabajador no existe en el maestro o falla, lo ignoramos silenciosamente
      // console.log(`Info: No se pudo sincronizar firma para DNI ${p.dni}`);
    }
  });
};

// --- 1. CREAR (POST) ---
const crearCapacitacion = async (req, res) => {
  try {
    let {
      participantes,
      codigo_acta,
      fecha,
      hora_inicio,
      hora_termino,
      institucion_procedencia,
      ...resto
    } = req.body;

    // 1. Parsear participantes
    if (typeof participantes === "string") {
      try {
        participantes = JSON.parse(participantes);
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Formato de participantes inválido" });
      }
    }
    participantes = participantes.filter(
      (p, index, self) =>
        index ===
        self.findIndex(
          (t) => t.dni === p.dni && t.dni !== "" // Compara DNI y asegura que no sea vacío
        )
    );

    // 2. CÁLCULO REAL EN EL BACKEND
    const calculo = calcularTotalesDesdeLista(participantes);

    const existe = await prisma.capacitaciones.findUnique({
      where: { codigo_acta },
    });
    if (existe)
      return res.status(400).json({ error: "El código de acta ya existe" });

    // Preparación de Fechas
    const fechaBase = new Date(fecha).toISOString().split("T")[0];
    const fechaHoraInicio = new Date(`${fechaBase}T${hora_inicio}:00`);
    const fechaHoraTermino = new Date(`${fechaBase}T${hora_termino}:00`);

    const nueva = await prisma.capacitaciones.create({
      data: {
        ...resto,
        codigo_acta,
        creado_por: req.user.id,
        expositor_institucion: institucion_procedencia,
        fecha: new Date(`${fecha}T00:00:00`),
        hora_inicio: fechaHoraInicio,
        hora_termino: fechaHoraTermino,
        centros: resto.centros || "Sin especificar",

        // USAMOS EL CÁLCULO DEL BACKEND
        total_hombres: calculo.total_hombres,
        total_mujeres: calculo.total_mujeres,
        total_trabajadores: calculo.total_trabajadores,

        // Aseguramos que la firma llegue como string único
        expositor_firma: Array.isArray(resto.expositor_firma)
          ? resto.expositor_firma[0]
          : resto.expositor_firma,

        participantes: {
          create: participantes.map((p) => ({
            numero: Number(p.numero),
            dni: p.dni,
            apellidos_nombres: p.apellidos_nombres,
            area: p.area,
            cargo: p.cargo,
            genero: p.genero || "M",
            condicion: p.condicion || "",
            firma: p.firma_url || null, // Guardamos en tabla participantes
          })),
        },
      },
      include: { participantes: true },
    });

    if (req.files && req.files.length > 0) {
      const documentosData = req.files.map((file) => ({
        id_capacitacion: nueva.id_capacitacion,
        tipo: "EVIDENCIA_FOTO",
        url: `/uploads/evidencias/${file.filename}`,
      }));
      await prisma.documentos.createMany({ data: documentosData });
    }

    // 🟢 MAGIA AQUÍ: Sincronizar firmas al Maestro
    sincronizarFirmasConMaestro(participantes);

    res.status(201).json({ mensaje: "Registrado con éxito", data: nueva });
  } catch (error) {
    console.error("Error al crear:", error);
    res.status(500).json({ error: "Error al guardar", detalle: error.message });
  }
};

// --- 2. OBTENER TODAS ---
const obtenerCapacitaciones = async (req, res) => {
  try {
    const { id, rol } = req.user;
    const filtro =
      rol === "Administrador" || rol === "Auditor" ? {} : { creado_por: id };

    const caps = await prisma.capacitaciones.findMany({
      where: filtro,
      orderBy: { fecha: "desc" },
      include: {
        usuarios: { select: { nombre: true } },
        documentos: { select: { id_documento: true, tipo: true } },
      },
    });
    res.json(caps);
  } catch (error) {
    res.status(500).json({ error: "Error al listar" });
  }
};

// --- 3. OBTENER UNA (DETALLE) ---
const obtenerCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscar la capacitación
    const capacitacion = await prisma.capacitaciones.findUnique({
      where: { id_capacitacion: Number(id) },
      include: {
        participantes: true,
        documentos: true,
      },
    });

    if (!capacitacion) return res.status(404).json({ error: "No encontrado" });

    // 🟢 CORRECCIÓN: Mapear 'firma' (BD) a 'firma_url' (Frontend)
    // Esto asegura que al editar, el frontend vea la firma guardada
    const participantesMapeados = capacitacion.participantes.map((p) => ({
      ...p,
      firma_url: p.firma,
    }));

    // 2. DETERMINAR LAS ÁREAS OBJETIVO
    let areasParaBuscar = [];

    if (capacitacion.area_objetivo) {
      areasParaBuscar = capacitacion.area_objetivo
        .split(",")
        .map((a) => a.trim());
    } else {
      const planes = await prisma.planAnual.findMany();
      const temaActual = normalizar(capacitacion.tema_principal);

      const planEncontrado = planes.find((p) => {
        const temaPlan = normalizar(p.tema);
        return temaPlan.includes(temaActual) || temaActual.includes(temaPlan);
      });

      if (planEncontrado && planEncontrado.areas_objetivo) {
        areasParaBuscar = planEncontrado.areas_objetivo
          .split(",")
          .map((a) => a.trim());
      }
    }

    // 3. CALCULAR FALTANTES
    let faltantes = [];

    if (areasParaBuscar.length > 0) {
      const todosTrabajadores = await prisma.trabajadores.findMany({
        where: { estado: true },
        select: {
          id_trabajador: true,
          dni: true,
          nombres: true,
          apellidos: true,
          cargo: true,
          area: true,
        },
      });

      const trabajadoresObjetivo = todosTrabajadores.filter((t) => {
        const areaTrabajador = normalizar(t.area);
        return areasParaBuscar.some(
          (areaObj) => areaTrabajador === normalizar(areaObj)
        );
      });

      const asistentesDNI = new Set(
        capacitacion.participantes.map((p) => p.dni)
      );

      faltantes = trabajadoresObjetivo.filter((t) => !asistentesDNI.has(t.dni));
    }

    // Enviamos 'participantesMapeados' en lugar de 'capacitacion.participantes' original
    res.json({
      ...capacitacion,
      participantes: participantesMapeados,
      faltantes,
      area_objetivo: capacitacion.area_objetivo || areasParaBuscar.join(", "),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener capacitación" });
  }
};

// --- 4. ACTUALIZAR (CON CÁLCULO DE TOTALES) ---
const actualizarCapacitacion = async (req, res) => {
  try {
    const { id } = req.params;
    let { participantes, ...resto } = req.body;

    // 1. Validar Participantes
    if (typeof participantes === "string") {
      try {
        participantes = JSON.parse(participantes);
      } catch (e) {
        return res
          .status(400)
          .json({ error: "Formato de participantes inválido" });
      }
    }
    // FILTRO DE DUPLICADOS
    participantes = participantes.filter(
      (p, index, self) =>
        index === self.findIndex((t) => t.dni === p.dni && t.dni !== "")
    );

    // 2. CÁLCULO DE TOTALES EN BACKEND
    const calculo = calcularTotalesDesdeLista(participantes);

    // 3. Validar Fechas
    if (!resto.fecha || !resto.hora_inicio || !resto.hora_termino) {
      return res.status(400).json({
        error:
          "Datos incompletos: La fecha, hora de inicio y término son obligatorias.",
      });
    }

    const fechaBase = new Date(resto.fecha).toISOString().split("T")[0];

    const crearFechaSegura = (fechaStr, horaStr) => {
      const horaLimpia = horaStr.length === 5 ? `${horaStr}:00` : horaStr;
      const nuevaFecha = new Date(`${fechaStr}T${horaLimpia}`);
      return isNaN(nuevaFecha.getTime()) ? null : nuevaFecha;
    };

    const horaInicioDate = crearFechaSegura(fechaBase, resto.hora_inicio);
    const horaTerminoDate = crearFechaSegura(fechaBase, resto.hora_termino);

    if (!horaInicioDate || !horaTerminoDate) {
      return res.status(400).json({
        error:
          "Formato de hora inválido. Asegúrese de llenar Inicio y Término.",
      });
    }

    const fechaDate = new Date(resto.fecha);

    // 4. Preparar Update
    const updateData = {
      tema_principal: resto.tema_principal,
      objetivo: resto.objetivo,
      temario: resto.temario,
      sede_empresa: resto.sede_empresa,
      codigo_acta: resto.codigo_acta,
      revision_usada: resto.revision_usada,
      actividad: resto.actividad,
      accion_correctiva: resto.accion_correctiva,
      modalidad: resto.modalidad,
      categoria: resto.categoria,
      centros: resto.centros,
      total_horas: resto.total_horas,

      expositor_nombre: resto.expositor_nombre,
      expositor_dni: resto.expositor_dni,
      expositor_institucion: resto.institucion_procedencia,

      expositor_firma: Array.isArray(resto.expositor_firma)
        ? resto.expositor_firma[0]
        : resto.expositor_firma,

      // USAMOS EL CÁLCULO DEL BACKEND
      total_hombres: calculo.total_hombres,
      total_mujeres: calculo.total_mujeres,
      total_trabajadores: calculo.total_trabajadores,

      fecha: fechaDate,
      hora_inicio: horaInicioDate,
      hora_termino: horaTerminoDate,

      participantes: {
        deleteMany: {},
        create: participantes.map((p) => ({
          numero: Number(p.numero),
          dni: p.dni,
          apellidos_nombres: p.apellidos_nombres,
          area: p.area,
          cargo: p.cargo,
          genero: p.genero || "M",
          // Guardamos firma (puede venir como firma_url del front o firma si ya existía)
          firma: p.firma_url || p.firma || null,
        })),
      },
    };

    // 5. Ejecutar Update
    const actualizado = await prisma.capacitaciones.update({
      where: { id_capacitacion: Number(id) },
      data: updateData,
    });

    // 6. Guardar Evidencias Nuevas
    if (req.files && req.files.length > 0) {
      const documentosData = req.files.map((file) => ({
        id_capacitacion: Number(id),
        tipo: "EVIDENCIA_FOTO",
        url: `/uploads/evidencias/${file.filename}`,
      }));
      await prisma.documentos.createMany({ data: documentosData });
    }

    // 🟢 MAGIA AQUÍ: Sincronizar firmas al Maestro también en Update
    sincronizarFirmasConMaestro(participantes);

    res.json({ mensaje: "Actualizado correctamente", data: actualizado });
  } catch (error) {
    console.error("❌ Error en Update:", error);
    res
      .status(500)
      .json({ error: "Error interno al actualizar", detalle: error.message });
  }
};

// --- 5. ELIMINAR ---
const eliminarCapacitacion = async (req, res) => {
  try {
    if (req.user.rol === "Auditor") {
      return res
        .status(403)
        .json({ error: "Acceso denegado: Auditor solo lectura." });
    }
    const { id } = req.params;

    await prisma.participantes.deleteMany({
      where: { id_capacitacion: Number(id) },
    });
    await prisma.documentos.deleteMany({
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

// --- 6. EXPORTAR EXCEL PRO ---
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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Reporte_Actas_Completo.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando excel:", error);
    res.status(500).json({ error: "Error al generar el Excel" });
  }
};

// --- OBTENER DETALLE CUMPLIMIENTO ---
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
      dnisAsistentes.has(t.dni)
    ).length;

    const faltantes = trabajadoresObjetivo.filter(
      (t) => !dnisAsistentes.has(t.dni)
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
};
