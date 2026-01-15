// backend/src/controllers/gestion.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ExcelJS = require("exceljs");
const fs = require("fs"); // Asegúrate de importar fs si usas unlinkSync

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

const subirPlanAnual = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No se subió ningún archivo" });

    console.log(`📂 Procesando archivo: ${req.file.originalname}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    // ---------------------------------------------------------
    // PASO 1: MAPEAR MODULOS
    // ---------------------------------------------------------
    const mapaTemarios = new Map();
    const sheetModulos =
      workbook.worksheets.find(
        (ws) =>
          ws.name.toLowerCase().includes("módulos") ||
          ws.name.toLowerCase().includes("modulos")
      ) || workbook.worksheets[1];

    if (sheetModulos) {
      console.log(`📄 Leyendo hoja Módulos...`);
      let colIndexModulo = 0;
      let colIndexContenido = 0;

      sheetModulos.eachRow((row, rowNumber) => {
        if (colIndexModulo > 0) return;
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value).toLowerCase();
          if (val.includes("módulo") || val.includes("modulos")) {
            colIndexModulo = colNumber;
            colIndexContenido = colNumber + 1;
          }
        });
      });

      if (colIndexModulo === 0) {
        colIndexModulo = 2;
        colIndexContenido = 3;
      }

      sheetModulos.eachRow((row) => {
        const nombreModulo = row.getCell(colIndexModulo).text?.trim();
        const contenido = row.getCell(colIndexContenido).text?.trim();

        if (
          nombreModulo &&
          !nombreModulo.toLowerCase().includes("módulo") &&
          !nombreModulo.toLowerCase().includes("contenido")
        ) {
          mapaTemarios.set(nombreModulo.toLowerCase(), contenido || "");
        }
      });
    }

    // ---------------------------------------------------------
    // PASO 2: LEER PLAN (TEMPLATE)
    // ---------------------------------------------------------
    const sheetPlan = workbook.worksheets[0];
    const nuevosPlanes = [];
    let stats = { directos: 0, agrupados: 0, huerfanos: 0, ignorados: 0 };

    let dataStartRow = 0;
    let colIndexes = { tema: 0, area: 0, clasificacion: 0, mesesStart: 0 };

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
        (x) =>
          x.txt.includes("tema") ||
          x.txt.includes("actividad") ||
          x.txt.includes("social")
      );
      const tieneArea = rowTexts.some(
        (x) =>
          x.txt.includes("procesos") ||
          x.txt.includes("área") ||
          x.txt.includes("area")
      );

      if (tieneTema && tieneArea) {
        dataStartRow = rowNumber + 1;
        rowTexts.forEach((x) => {
          if (
            x.txt.includes("tema") ||
            x.txt.includes("actividad") ||
            x.txt.includes("social")
          )
            colIndexes.tema = x.col;
          else if (
            x.txt.includes("procesos") ||
            x.txt.includes("área") ||
            x.txt.includes("area")
          )
            colIndexes.area = x.col;
          else if (x.txt.includes("clasificación"))
            colIndexes.clasificacion = x.col;
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
      colIndexes = { tema: 2, area: 5, clasificacion: 3, mesesStart: 8 };
    }

    sheetPlan.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      const temaExcel =
        colIndexes.tema > 0 ? row.getCell(colIndexes.tema).text?.trim() : null;
      const areaNombre =
        colIndexes.area > 0 ? row.getCell(colIndexes.area).text?.trim() : null;

      if (!temaExcel || temaExcel.length < 3 || !areaNombre) {
        stats.ignorados++;
        return;
      }

      let temaFinal = temaExcel;
      let temarioFinal = "Tema Específico";
      let clasificacion =
        colIndexes.clasificacion > 0
          ? row.getCell(colIndexes.clasificacion).text?.trim()
          : "";
      let encontrado = false;

      const temaExcelClean = temaExcel
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      for (const [keyModulo, valContenido] of mapaTemarios.entries()) {
        if (keyModulo === temaExcelClean) {
          temaFinal = keyModulo.charAt(0).toUpperCase() + keyModulo.slice(1);
          temarioFinal = valContenido;
          stats.directos++;
          encontrado = true;
          break;
        }
      }

      if (!encontrado) {
        for (const [nombreModulo, contenidoModulo] of mapaTemarios.entries()) {
          const contenidoClean = String(contenidoModulo)
            .toLowerCase()
            .replace(/\s+/g, " ");

          if (contenidoClean.includes(temaExcelClean)) {
            temaFinal =
              nombreModulo.charAt(0).toUpperCase() + nombreModulo.slice(1);
            temarioFinal = contenidoModulo;
            clasificacion = `${clasificacion} (Detalle: ${temaExcel})`;
            stats.agrupados++;
            encontrado = true;
            break;
          }
        }
      }

      if (!encontrado) stats.huerfanos++;

      let mesDetectado = "Por Definir";
      if (colIndexes.mesesStart > 0) {
        for (let i = 0; i < 12; i++) {
          const colIdx = colIndexes.mesesStart + i;
          const cell = row.getCell(colIdx);
          if (
            (cell.value && String(cell.value).trim()) ||
            (cell.fill && cell.fill.type === "pattern")
          ) {
            const hRow = sheetPlan.getRow(dataStartRow - 1);
            const mHead = hRow.getCell(colIdx).text?.toLowerCase() || "";
            for (const [short, full] of Object.entries(MONTH_MAP)) {
              if (mHead.includes(short)) {
                mesDetectado = full;
                break;
              }
            }
            if (mesDetectado !== "Por Definir") break;
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
      });
    });

    await prisma.planAnual.deleteMany({});
    if (nuevosPlanes.length > 0) {
      await prisma.planAnual.createMany({ data: nuevosPlanes });
    }

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
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

// --- 2. OBTENER AVANCE (SOPORTE PARA ÁREAS + CATEGORÍAS EDS/CIFHS) ---
const obtenerAvance = async (req, res) => {
  try {
    // 1. Obtener datos base
    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany(),
      prisma.trabajadores.findMany({ where: { estado: true } }),
      prisma.capacitaciones.findMany({
        include: { participantes: { select: { dni: true } } },
      }),
    ]);

    // 2. Agrupar el Plan Anual por TEMA ÚNICO
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

      if (plan.areas_objetivo) {
        plan.areas_objetivo.split(",").forEach((a) => {
          const areaLimpia = a.trim();
          if (areaLimpia) entry.areasSet.add(areaLimpia);
        });
      }
    });

    // 3. Calcular Métricas por Tema Unificado
    const reporte = Object.values(temasUnificados).map((datosTema) => {
      const temaNorm = normalizar(datosTema.tema);

      // A. Buscar capacitaciones de este tema
      const capsDelTema = capacitaciones.filter((c) => {
        const temaCap = normalizar(c.tema_principal);
        return temaCap.includes(temaNorm) || temaNorm.includes(temaCap);
      });

      // B. Asistentes Únicos (Set de DNI)
      const dnisAsistentes = new Set();
      capsDelTema.forEach((cap) => {
        cap.participantes.forEach((p) => {
          if (p.dni) dnisAsistentes.add(p.dni);
        });
      });

      // C. Meta (Trabajadores filtrados por Área O Categoría)
      const areasLista = Array.from(datosTema.areasSet);

      const trabajadoresObjetivo = trabajadores.filter((t) => {
        const areaT = normalizar(t.area); // Área del trabajador
        // 🟢 NUEVO: También normalizamos la categoría (si es nula, string vacío)
        const catT = normalizar(t.categoria || "");

        return areasLista.some((areaPlanRaw) => {
          const areaPlan = normalizar(areaPlanRaw); // Lo que dice el Excel (ej: "CIFHS")

          // 🟢 DICCIONARIO ACTUALIZADO (Con Mantenimiento fusionado)
          const diccionario = {
            // --- CATEGORÍAS ESPECIALES ---
            cifhs: [
              "cifhs",
              "hostigamiento",
              "comite de intervencion",
              "genero",
            ],
            eds: ["eds", "desempeño social", "equipo de desempeño"],
            scsst: ["scsst", "comite de seguridad", "csst"],

            // --- ÁREAS ---
            rrhh: [
              "recursos humanos",
              "personal",
              "rrhh",
              "humanos",
              "social",
              "trabajadora social",
              "bienestar",
            ],
            sig: [
              "sig",
              "sistema de gestion",
              "integrado",
              "calidad",
              "sso",
              "seguridad y salud",
            ],
            logistica: [
              "logistica",
              "almacen",
              "compras",
              "adquisiciones",
              "suministros",
            ],
            planificacion: [
              "planificacion",
              "planeamiento",
              "control",
              "proyectos",
            ],
            sanidad: ["sanidad", "evaluadores", "plagas"],
            agricola: [
              "agricola",
              "campo",
              "riego",
              "cosecha",
              "cultivo",
              "fitosanidad",
            ],

            // 🟢 AQUÍ ESTÁ LA FUSIÓN:
            // Si el Excel dice "Mantenimiento" O "Mecanización", busca "taller" o "mecanizacion" en el trabajador
            mecanizacion: [
              "mecanizacion",
              "maquinaria",
              "taller",
              "mantenimiento",
            ],
            mantenimiento: [
              "mecanizacion",
              "maquinaria",
              "taller",
              "mantenimiento",
            ],

            // Grupos
            administrativos: [
              "recursos humanos",
              "personal",
              "rrhh",
              "humanos",
              "social",
              "sig",
              "sistema de gestion",
              "integrado",
              "calidad",
              "sso",
              "logistica",
              "almacen",
              "compras",
              "adquisiciones",
              "suministros",
              "planificacion",
              "planeamiento",
              "control",
              "proyectos",
              "administracion",
              "administrativo",
            ],
            administracion: [
              "recursos humanos",
              "personal",
              "rrhh",
              "humanos",
              "social",
              "sig",
              "sistema de gestion",
              "integrado",
              "calidad",
              "sso",
              "logistica",
              "almacen",
              "compras",
              "adquisiciones",
              "suministros",
              "planificacion",
              "planeamiento",
              "control",
              "proyectos",
              "administracion",
              "administrativo",
            ],
          };

          // 1. Si existe en el diccionario
          if (diccionario[areaPlan]) {
            // 🟢 CAMBIO CLAVE: Verifica si coincide con el AREA O con la CATEGORIA
            return diccionario[areaPlan].some(
              (sinonimo) => areaT.includes(sinonimo) || catT.includes(sinonimo)
            );
          }

          // 2. Búsqueda normal (texto exacto) en ambos campos
          return areaT.includes(areaPlan) || catT.includes(areaPlan);
        });
      });

      const metaTotal = trabajadoresObjetivo.length;

      // D. Real y Faltantes
      const asistentesValidos = trabajadoresObjetivo.filter((t) =>
        dnisAsistentes.has(t.dni)
      );

      const faltantes = trabajadoresObjetivo.filter(
        (t) => !dnisAsistentes.has(t.dni)
      );

      let avanceReal = asistentesValidos.length;

      if (metaTotal === 0 && dnisAsistentes.size > 0) {
        avanceReal = dnisAsistentes.size;
      }

      let porcentaje = 0;
      if (metaTotal > 0) {
        porcentaje = (avanceReal / metaTotal) * 100;
      } else {
        porcentaje = avanceReal > 0 ? 100 : 0;
      }

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
          // 🟢 Opcional: Devolver categoría para que veas si filtró bien en el frontend
          categoria: f.categoria,
        })),
      };
    });

    reporte.sort((a, b) => a.porcentaje - b.porcentaje);

    res.json(reporte);
  } catch (error) {
    console.error("Error obteniendo avance:", error);
    res.status(500).json({ error: "Error calculando avance" });
  }
};

const obtenerListaTemas = async (req, res) => {
  try {
    const planes = await prisma.planAnual.findMany({
      select: {
        tema: true,
        clasificacion: true,
        areas_objetivo: true, // 
        objetivo: true, //
        categoria : true, // 
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
