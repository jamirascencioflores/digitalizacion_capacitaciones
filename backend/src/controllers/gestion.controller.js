// backend/src/controllers/gestion.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const fs = require("fs");

const MONTH_MAP = {
  ene: "Enero",
  feb: "Febrero",
  mar: "Marzo",
  abr: "Abril",
  may: "Mayo",
  jun: "Junio",
  jul: "Julio",
  ago: "Agosto",
  sep: "Septiembre",
  oct: "Octubre",
  nov: "Noviembre",
  dic: "Diciembre",
  jan: "Enero",
  apr: "Abril",
  aug: "Agosto",
  dec: "Diciembre",
};

// Función auxiliar
const normalizar = (texto) => {
  return texto
    ? texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";
};

// 🟢 1. SUBIR PLAN ANUAL (CON CORRECCIÓN DE CATEGORÍA/EJE)
const subirPlanAnual = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No se subió ningún archivo" });

    console.log(`📂 Procesando archivo: ${req.file.originalname}`);
    const workbook = new ExcelJS.Workbook();

    // 🟢 CORRECCIÓN 1: Usamos .load(buffer) en lugar de .readFile(path)
    // Porque estamos usando memoryStorage
    await workbook.xlsx.load(req.file.buffer);

    // ... (Tu lógica de Módulos se mantiene igual, la omito para ahorrar espacio) ...
    // ... Si tienes mapaTemarios, úsalo aquí ...
    const mapaTemarios = new Map(); // (Asegúrate de copiar tu lógica de módulos si la usas)

    // ---------------------------------------------------------
    // PASO 2: LEER PLAN
    // ---------------------------------------------------------
    const sheetPlan = workbook.worksheets[0];
    const nuevosPlanes = [];
    let stats = { directos: 0, agrupados: 0, huerfanos: 0, ignorados: 0 };

    let dataStartRow = 0;

    // 🟢 CORRECCIÓN 2: Agregamos 'categoria' al índice
    let colIndexes = {
      tema: 0,
      area: 0,
      clasificacion: 0,
      categoria: 0,
      mesesStart: 0,
    };

    sheetPlan.eachRow((row, rowNumber) => {
      if (dataStartRow > 0) return;
      const rowTexts = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowTexts.push({
          txt: String(cell.value || "")
            .toLowerCase()
            .trim(),
          col: colNumber,
        });
      });

      const tieneTema = rowTexts.some(
        (x) => x.txt.includes("tema") || x.txt.includes("actividad"),
      );
      const tieneArea = rowTexts.some(
        (x) =>
          x.txt.includes("procesos") ||
          x.txt.includes("área") ||
          x.txt.includes("area"),
      );

      if (tieneTema && tieneArea) {
        dataStartRow = rowNumber + 1;
        rowTexts.forEach((x) => {
          if (x.txt.includes("tema") || x.txt.includes("actividad"))
            colIndexes.tema = x.col;
          else if (
            x.txt.includes("procesos") ||
            x.txt.includes("área") ||
            x.txt.includes("area")
          )
            colIndexes.area = x.col;
          else if (x.txt.includes("clasificación"))
            colIndexes.clasificacion = x.col;
          // 🟢 CORRECCIÓN 3: Detectamos EJE o CATEGORÍA
          else if (
            x.txt.includes("categoría") ||
            x.txt.includes("categoria") ||
            x.txt.includes("eje")
          )
            colIndexes.categoria = x.col;

          if (
            colIndexes.mesesStart === 0 &&
            (x.txt.includes("ene") || x.txt.includes("jan"))
          )
            colIndexes.mesesStart = x.col;
        });
      }
    });

    // Valores por defecto si falla la detección
    if (colIndexes.tema === 0) {
      dataStartRow = 12;
      colIndexes = {
        tema: 2,
        area: 5,
        clasificacion: 3,
        categoria: 4,
        mesesStart: 8,
      };
    }

    sheetPlan.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      const temaExcel =
        colIndexes.tema > 0 ? row.getCell(colIndexes.tema).text?.trim() : null;
      const areaNombre =
        colIndexes.area > 0 ? row.getCell(colIndexes.area).text?.trim() : null;

      // 🔴 1. FILTRO DE LIMPIEZA AGRESIVO
      // Si el texto normalizado es igual a un encabezado, LO SALTAMOS
      const temaCheck = normalizar(temaExcel || "");
      const areaCheck = normalizar(areaNombre || "");

      const blacklist = [
        "tema",
        "temas",
        "actividad",
        "actividades",
        "area",
        "areas",
        "area/procesos",
        "procesos",
        "proceso",
        "responsable",
        "clasificacion",
        "mes",
      ];

      if (
        !temaExcel ||
        temaExcel.length < 3 ||
        !areaNombre ||
        blacklist.includes(temaCheck) ||
        blacklist.includes(areaCheck)
      ) {
        stats.ignorados++;
        return;
      }

      let temaFinal = temaExcel;
      let temarioFinal = "Tema Específico";
      let clasificacion =
        colIndexes.clasificacion > 0
          ? row.getCell(colIndexes.clasificacion).text?.trim()
          : "Capacitación";

      // 🟢 CORRECCIÓN 4: Leemos el valor de la columna EJE/CATEGORÍA
      let categoriaFinal =
        colIndexes.categoria > 0
          ? row.getCell(colIndexes.categoria).text?.trim()
          : "Otros";
      // Limpieza básica por si viene vacío
      if (!categoriaFinal || categoriaFinal === "null")
        categoriaFinal = "Otros";

      // ... (Tu lógica de agrupación con mapaTemarios sigue aquí) ...
      // Como no tengo tu mapaTemarios completo en este snippet,
      // asumo que lo tienes o usas el tema directo.

      // Lógica simplificada de Meses
      let mesDetectado = "Por Definir";
      if (colIndexes.mesesStart > 0) {
        for (let i = 0; i < 12; i++) {
          const colIdx = colIndexes.mesesStart + i;
          const cell = row.getCell(colIdx);
          if (
            (cell.value && String(cell.value).trim()) ||
            (cell.fill && cell.fill.type === "pattern")
          ) {
            // Lógica simple de mes, puedes usar tu MONTH_MAP aquí
            mesDetectado = "Programado";
            break;
          }
        }
      }

      nuevosPlanes.push({
        tema: temaFinal,
        objetivo: `Original: ${temaExcel}`,
        temario: temarioFinal,
        areas_objetivo: areaNombre,
        mes_programado: mesDetectado,
        clasificacion: clasificacion,
        categoria: categoriaFinal, // 🟢 AQUÍ GUARDAMOS "Gobernanza"
      });
    });

    await prisma.planAnual.deleteMany({});
    if (nuevosPlanes.length > 0) {
      await prisma.planAnual.createMany({ data: nuevosPlanes });
    }

    // No necesitamos fs.unlink porque está en memoria

    res.json({
      mensaje: "Importación completada",
      stats,
      total: nuevosPlanes.length,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- 2. OBTENER AVANCE (CON FILTROS ANTI-COLADOS) ---
const obtenerAvance = async (req, res) => {
  try {
    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany(),
      prisma.trabajadores.findMany({ where: { estado: true } }),
      prisma.capacitaciones.findMany({
        include: { participantes: { select: { dni: true } } },
      }),
    ]);

    const temasUnificados = {};
    planes.forEach((plan) => {
      const temaNorm = normalizar(plan.tema);
      if (!temasUnificados[temaNorm]) {
        temasUnificados[temaNorm] = {
          id_referencia: plan.id_plan,
          tema: plan.tema,
          mesesSet: new Set(),
          objetivosSet: new Set(),
          areasSet: new Set(),
        };
      }
      const entry = temasUnificados[temaNorm];
      if (plan.mes_programado) entry.mesesSet.add(plan.mes_programado);

      const objLimpio = plan.objetivo
        ? plan.objetivo.replace("Original: ", "")
        : "";
      if (objLimpio) entry.objetivosSet.add(objLimpio);

      if (plan.areas_objetivo)
        plan.areas_objetivo.split(",").forEach((a) => {
          if (a.trim()) entry.areasSet.add(a.trim());
        });
    });

    const reporte = Object.values(temasUnificados).map((datosTema) => {
      const temaNorm = normalizar(datosTema.tema);

      // Cálculo de avance real (Capacitaciones ejecutadas)
      const capsDelTema = capacitaciones.filter((c) => {
        const temaCap = normalizar(c.tema_principal);
        return temaCap.includes(temaNorm) || temaNorm.includes(temaCap);
      });

      const dnisAsistentes = new Set();
      capsDelTema.forEach((cap) =>
        cap.participantes.forEach((p) => {
          if (p.dni) dnisAsistentes.add(p.dni);
        }),
      );

      const areasLista = Array.from(datosTema.areasSet);

      // 🟢 FILTRADO DE TRABAJADORES (META)
      const trabajadoresObjetivo = trabajadores.filter((t) => {
        const areaT = normalizar(t.area || "");
        const catT = normalizar(t.categoria || "");
        const cargoT = normalizar(t.cargo || "");

        // 🔴 1. IDENTIFICACIÓN PREVIA: ¿Es de Operaciones?
        const palabrasOperaciones = ["operaciones", "planta", "packing"];
        const esDeOperaciones = palabrasOperaciones.some((op) =>
          areaT.includes(op),
        );

        return areasLista.some((areaPlanRaw) => {
          const areaPlan = normalizar(areaPlanRaw);

          // 🔴 2. CUARENTENA DE OPERACIONES
          // Si el trabajador es de Operaciones, SOLO entra si el Plan pide explícitamente Operaciones.
          if (esDeOperaciones) {
            const planPideOperaciones = palabrasOperaciones.some((op) =>
              areaPlan.includes(op),
            );
            if (!planPideOperaciones) return false; // Bloqueado para cualquier otra área
          }

          // 🔴 3. FILTROS ANTI-COLADOS ESPECÍFICOS

          // Regla: AGRICOLA (Excluye Riego, Taller, RRHH)
          if (areaPlan.includes("agricola")) {
            const prohibidos = [
              "riego",
              "taller",
              "mecanico",
              "mecanizacion",
              "mantenimiento",
              "rrhh",
              "recursos humanos",
              "operaciones",
            ];
            if (prohibidos.some((p) => areaT.includes(p))) return false;
          }

          // Regla: RIEGO (Excluye Agricola general, Taller, Operaciones)
          if (areaPlan.includes("riego")) {
            const prohibidos = ["operaciones", "agricola", "campo", "taller"];
            if (prohibidos.some((p) => areaT.includes(p))) return false;
          }

          // 🔵 4. BÚSQUEDA POSITIVA (Si pasó los filtros)

          const diccionario = {
            cifhs: [
              "cifhs",
              "hostigamiento",
              "comite de intervencion",
              "genero",
              "violencia",
            ],
            eds: ["eds", "desempeño social", "equipo de desempeño"],
            scsst: ["scsst", "comite de seguridad", "csst"],
            rrhh: [
              "recursos humanos",
              "personal",
              "rrhh",
              "bienestar",
              "social",
            ],
            sig: ["sig", "sistema de gestion", "integrado", "calidad", "sso"],
            // Si quieres que el backend entienda "riego" como parte de "agricola" en otros contextos, agrégalo,
            // pero las reglas de arriba (if) tienen prioridad y lo bloquearán si es necesario.
          };

          // A. Por Diccionario
          if (diccionario[areaPlan]) {
            const foundInDict = diccionario[areaPlan].some(
              (sinonimo) =>
                areaT.includes(sinonimo) ||
                catT.includes(sinonimo) ||
                cargoT.includes(sinonimo),
            );
            if (foundInDict) return true;
          }

          // B. Por Coincidencia Directa (Unidireccional y Estricta)
          if (areaPlan.length > 3) {
            const prohibidasGen = [
              "area",
              "areas",
              "departamento",
              "gerencia",
              "jefatura",
              "procesos",
              "tema",
            ];
            if (prohibidasGen.includes(areaPlan)) return false;

            return (
              areaT.includes(areaPlan) ||
              catT.includes(areaPlan) ||
              cargoT.includes(areaPlan)
            );
          }
          return false;
        });
      });

      const metaTotal = trabajadoresObjetivo.length;
      const asistentesValidos = trabajadoresObjetivo.filter((t) =>
        dnisAsistentes.has(t.dni),
      );
      const faltantes = trabajadoresObjetivo.filter(
        (t) => !dnisAsistentes.has(t.dni),
      );

      let avanceReal = asistentesValidos.length;
      if (metaTotal === 0 && dnisAsistentes.size > 0)
        avanceReal = dnisAsistentes.size;

      let porcentaje =
        metaTotal > 0
          ? (avanceReal / metaTotal) * 100
          : avanceReal > 0
            ? 100
            : 0;

      return {
        id_plan: datosTema.id_referencia,
        tema: datosTema.tema,
        objetivo: Array.from(datosTema.objetivosSet).join(" + "),
        area: areasLista.join(", "),
        mes: Array.from(datosTema.mesesSet).join(" / "),
        meta_total: metaTotal,
        avance_real: avanceReal,
        porcentaje: Number(porcentaje.toFixed(1)),
        faltantes: faltantes.map((f) => ({
          dni: f.dni,
          apellidos: f.apellidos,
          nombres: f.nombres,
          cargo: f.cargo,
          categoria: f.categoria,
        })),
      };
    });

    reporte.sort((a, b) => a.porcentaje - b.porcentaje);
    res.json(reporte);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error calculando avance" });
  }
};

// --- 3. OBTENER LISTA (También corregido para devolver categoria) ---
const obtenerListaTemas = async (req, res) => {
  try {
    const planes = await prisma.planAnual.findMany({
      select: {
        tema: true,
        clasificacion: true,
        areas_objetivo: true,
        objetivo: true,
        categoria: true, // 🟢 Aseguramos que esto se envíe
      },
      distinct: ["tema"],
    });
    res.json(planes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error cargando temas" });
  }
};

module.exports = { subirPlanAnual, obtenerAvance, obtenerListaTemas };
