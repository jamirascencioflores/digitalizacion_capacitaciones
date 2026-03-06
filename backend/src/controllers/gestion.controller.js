// backend/src/controllers/gestion.controller.js
const prisma = require("../utils/db");
let ExcelJS = null; // Carga diferida
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

// 🟢 1. SUBIR PLAN ANUAL (AHORA CON PROTECCIÓN ANTI-AUDITOR)
const subirPlanAnual = async (req, res) => {
  try {
    // 🛡️ PROTECCIÓN DE ROL: Un auditor NO puede modificar la base de datos
    if (req.user?.rol === "Auditor") {
      return res.status(403).json({
        error:
          "Acceso denegado: Los auditores no pueden importar el plan anual",
      });
    }

    if (!req.file)
      return res.status(400).json({ error: "No se subió ningún archivo" });

    console.log(`📂 Procesando archivo: ${req.file.originalname}`);
    if (!ExcelJS) ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(req.file.buffer);

    const sheetPlan = workbook.worksheets[0];
    const nuevosPlanes = [];
    let stats = { directos: 0, agrupados: 0, huerfanos: 0, ignorados: 0 };
    let dataStartRow = 0;

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
      let categoriaFinal =
        colIndexes.categoria > 0
          ? row.getCell(colIndexes.categoria).text?.trim()
          : "Otros";
      if (!categoriaFinal || categoriaFinal === "null")
        categoriaFinal = "Otros";

      let mesDetectado = "Por Definir";
      if (colIndexes.mesesStart > 0) {
        for (let i = 0; i < 12; i++) {
          const colIdx = colIndexes.mesesStart + i;
          const cell = row.getCell(colIdx);
          if (
            (cell.value && String(cell.value).trim()) ||
            (cell.fill && cell.fill.type === "pattern")
          ) {
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
        categoria: categoriaFinal,
      });
    });

    await prisma.planAnual.deleteMany({});
    if (nuevosPlanes.length > 0) {
      await prisma.planAnual.createMany({ data: nuevosPlanes });
    }

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

// 🟢 2. OBTENER AVANCE (CORREGIDO PARA EVITAR ERROR UNDEFINED)
const obtenerAvance = async (req, res) => {
  try {
    // 🟢 SOLUCIÓN: Extraemos con seguridad por si req.user no está definido
    const id_usuario = req.user?.id_usuario || null;
    const rol = req.user?.rol || "Desconocido";

    // 🛡️ FILTRO ESTRICTO:
    // Si es Admin o Auditor, ve TODO ({}).
    // Si es Supervisor (o no tiene rol), solo ve lo suyo. Si no hay id_usuario, buscamos -1 para que por seguridad no devuelva nada.
    const filtroCapacitaciones =
      rol === "Administrador" || rol === "Auditor"
        ? {}
        : { creado_por: id_usuario || -1 };

    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany(),
      prisma.trabajadores.findMany({ where: { estado: true } }),
      prisma.capacitaciones.findMany({
        where: filtroCapacitaciones, // Aplicamos el filtro seguro
        include: { participantes: { select: { dni: true } } },
      }),
    ]);

    // 🟢 OPTIMIZACIÓN 1: Pre-normalizar trabajadores una sola vez
    const trabajadoresNorm = trabajadores.map(t => ({
      ...t,
      areaN: normalizar(t.area),
      catN: normalizar(t.categoria),
      cargoN: normalizar(t.cargo),
      palabrasOperaciones: ["operaciones", "planta", "packing"].some(op => normalizar(t.area).includes(op))
    }));

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
          areasNorm: [] // Para evitar normalizar en el loop de trabajadores
        };
      }
      const entry = temasUnificados[temaNorm];
      if (plan.mes_programado) entry.mesesSet.add(plan.mes_programado);
      const objLimpio = plan.objetivo ? plan.objetivo.replace("Original: ", "") : "";
      if (objLimpio) entry.objetivosSet.add(objLimpio);

      if (plan.areas_objetivo) {
        plan.areas_objetivo.split(",").forEach((a) => {
          const areaTrim = a.trim();
          if (areaTrim) {
            entry.areasSet.add(areaTrim);
          }
        });
      }
    });

    // 🟢 OPTIMIZACIÓN 2: Pre-normalizar áreas de temas
    Object.values(temasUnificados).forEach(entry => {
      entry.areasNorm = Array.from(entry.areasSet).map(a => normalizar(a));
    });

    const reporte = Object.values(temasUnificados).map((datosTema) => {
      const temaNorm = normalizar(datosTema.tema);

      const dnisAsistentes = new Set();
      // Filtrar capacitaciones relevantes una vez
      capacitaciones.forEach((cap) => {
        const temaCap = normalizar(cap.tema_principal);
        if (temaCap.includes(temaNorm) || temaNorm.includes(temaCap)) {
          cap.participantes.forEach((p) => {
            if (p.dni) dnisAsistentes.add(p.dni);
          });
        }
      });

      const areasListaNorm = datosTema.areasNorm;
      const palabrasOperaciones = ["operaciones", "planta", "packing"];

      // 🟢 OPTIMIZACIÓN 3: Usar trabajadores pre-normalizados
      const trabajadoresObjetivo = trabajadoresNorm.filter((t) => {
        const esDeOperaciones = t.palabrasOperaciones;

        return areasListaNorm.some((areaPlan) => {
          // Regla: CUARENTENA OPERACIONES
          if (esDeOperaciones) {
            const planPideOperaciones = palabrasOperaciones.some((op) => areaPlan.includes(op));
            if (!planPideOperaciones) return false;
          }
          if (areaPlan.includes("agricola")) {
            const prohibidos = ["riego", "taller", "mecanico", "mecanizacion", "mantenimiento", "rrhh", "recursos humanos", "operaciones"];
            if (prohibidos.some((p) => t.areaN.includes(p))) return false;
          }
          if (areaPlan.includes("riego")) {
            const prohibidos = ["operaciones", "agricola", "campo", "taller"];
            if (prohibidos.some((p) => t.areaN.includes(p))) return false;
          }

          // Diccionario
          const diccionario = {
            rrhh: ["recursos humanos", "personal", "rrhh", "bienestar", "social"],
            sig: ["sig", "sistema de gestion", "integrado", "calidad", "sso"],
            logistica: ["logistica", "almacen", "compras", "adquisiciones", "suministros"],
            planificacion: ["planificacion", "planeamiento", "control", "proyectos"],
            cifhs: ["cifhs", "hostigamiento", "comite de intervencion", "genero", "violencia"],
            eds: ["eds", "desempeño social", "equipo de desempeño"],
            scsst: ["scsst", "comite de seguridad", "csst"],
            agricola: ["agricola", "campo", "cosecha", "cultivo", "fitosanidad"],
            sanidad: ["sanidad", "evaluadores", "plagas"],
            riego: ["riego"],
            operaciones: ["operaciones", "planta", "packing"],
            mantenimiento: ["mantenimiento", "taller", "mecanizacion", "maquinaria", "mecanico"],
            mecanizacion: ["mecanizacion", "taller", "mantenimiento", "maquinaria"],
          };

          if (diccionario[areaPlan]) {
            return diccionario[areaPlan].some(
              (sinonimo) => t.areaN.includes(sinonimo) || t.catN.includes(sinonimo) || t.cargoN.includes(sinonimo)
            );
          }

          if (areaPlan.length > 3) {
            const prohibidasGen = ["area", "areas", "departamento", "gerencia", "jefatura", "procesos", "tema"];
            if (prohibidasGen.includes(areaPlan)) return false;
            return t.areaN.includes(areaPlan) || t.catN.includes(areaPlan) || t.cargoN.includes(areaPlan);
          }
          return false;
        });
      });

      const metaTotal = trabajadoresObjetivo.length;
      const asistentesValidos = trabajadoresObjetivo.filter((t) => dnisAsistentes.has(t.dni));
      const faltantes = trabajadoresObjetivo.filter((t) => !dnisAsistentes.has(t.dni));

      let avanceReal = asistentesValidos.length;
      if (metaTotal === 0 && dnisAsistentes.size > 0) avanceReal = dnisAsistentes.size;

      const porcentaje = metaTotal > 0 ? (avanceReal / metaTotal) * 100 : (avanceReal > 0 ? 100 : 0);

      return {
        id_plan: datosTema.id_referencia,
        tema: datosTema.tema,
        objetivo: Array.from(datosTema.objetivosSet).join(" + "),
        area: Array.from(datosTema.areasSet).join(", "),
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
