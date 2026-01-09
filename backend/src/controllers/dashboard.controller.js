// backend/src/controllers/dashboard.controller.js
const prisma = require("../utils/db");

// Función de ayuda para normalizar (usada en varios lugares)
const normalizar = (texto) => {
  return texto
    ? texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";
};

// --- 1. TARJETAS DE ESTADÍSTICAS (KPIs - Lógica ANUAL) ---
const getStats = async (req, res) => {
  try {
    const { id, rol } = req.user;
    const filtro =
      rol === "Administrador" || rol === "Auditor" ? {} : { creado_por: id };

    const now = new Date();
    const inicioAnio = new Date(now.getFullYear(), 0, 1);
    const finAnio = new Date(now.getFullYear() + 1, 0, 1);

    const [
      capsAnuales,
      capsHistorico,
      asistenciasHistoricas,
      personasUnicas,
      totalTrabajadores,
    ] = await Promise.all([
      prisma.capacitaciones.count({
        where: { ...filtro, fecha: { gte: inicioAnio, lt: finAnio } },
      }),
      prisma.capacitaciones.count({ where: filtro }),
      prisma.capacitaciones.aggregate({
        _sum: { total_hombres: true, total_mujeres: true },
        where: filtro,
      }),
      prisma.participantes.findMany({
        distinct: ["dni"],
        select: { id_participante: true },
      }),
      prisma.trabajadores.count({ where: { estado: true } }),
    ]);

    const totalParticipantes =
      (asistenciasHistoricas._sum.total_hombres || 0) +
      (asistenciasHistoricas._sum.total_mujeres || 0);

    let promedio = 0;
    if (capsHistorico > 0) {
      promedio = (totalParticipantes / capsHistorico).toFixed(1);
    }

    let cobertura = 0;
    if (totalTrabajadores > 0) {
      cobertura = ((personasUnicas.length / totalTrabajadores) * 100).toFixed(
        1
      );
    }

    res.json({
      totalCapacitaciones: capsAnuales,
      totalParticipantes: totalParticipantes,
      promedioAsistencia: String(promedio),
      coberturaGlobal: `${cobertura}%`,
      personasUnicas: personasUnicas.length,
      totalTrabajadores: totalTrabajadores,
    });
  } catch (error) {
    console.error("Error en getStats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};

// --- 2. LISTA DE RECIENTES ---
const getRecent = async (req, res) => {
  try {
    const { id, rol } = req.user;
    const filtro =
      rol === "Administrador" || rol === "Auditor" ? {} : { creado_por: id };

    const recientes = await prisma.capacitaciones.findMany({
      where: filtro,
      take: 10,
      orderBy: { fecha: "desc" },
      include: {
        participantes: { select: { dni: true } },
      },
    });

    const data = recientes.map((cap) => {
      const unicos = new Set(cap.participantes.map((p) => p.dni)).size;
      return {
        id_capacitacion: cap.id_capacitacion,
        fecha: cap.fecha,
        tema_principal: cap.tema_principal || "Sin tema",
        expositor_nombre: cap.expositor_nombre || "Sin expositor",
        sede_empresa: cap.sede_empresa || "-",
        codigo_acta: cap.codigo_acta || "-",
        total_asistentes: unicos,
      };
    });

    res.json(data);
  } catch (error) {
    console.error("Error en getRecent:", error);
    res.status(500).json({ error: "Error al obtener recientes" });
  }
};

// --- 3. DISTRIBUCIÓN (LÓGICA CORREGIDA: AGRUPACIÓN POR TEMAS ÚNICOS) ---
const getDistribution = async (req, res) => {
  try {
    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany(),
      prisma.trabajadores.findMany({ where: { estado: true } }),
      prisma.capacitaciones.findMany({
        include: { participantes: { select: { dni: true } } },
      }),
    ]);

    // --- PASO 1: AGRUPAR EL PLAN ANUAL POR TEMA ÚNICO ---
    // Esto evita que si un tema aparece 3 veces en el plan, se cuente 3 veces.
    // Estructura: { "tema_normalizado": { nombre: "Tema Original", areas: Set("AGRICOLA", "RIEGO") } }
    const temasUnicosMap = {};

    planes.forEach((plan) => {
      if (!plan.areas_objetivo) return;

      const temaNorm = normalizar(plan.tema);
      const areasRow = plan.areas_objetivo.split(",").map((a) => a.trim());

      if (!temasUnicosMap[temaNorm]) {
        temasUnicosMap[temaNorm] = {
          nombreOriginal: plan.tema, // Guardamos uno para referencia
          areasSet: new Set(), // Usamos Set para que las áreas no se repitan por tema
        };
      }

      // Agregamos las áreas de esta fila al Set del tema
      areasRow.forEach((area) => {
        if (area) temasUnicosMap[temaNorm].areasSet.add(area);
      });
    });

    // Mapa acumulador final: { "AGRICOLA": { meta: 0, real: 0 } }
    const areaStats = {};

    // --- PASO 2: ITERAR POR CADA TEMA ÚNICO ---
    for (const [temaNorm, datosTema] of Object.entries(temasUnicosMap)) {
      // A. Buscamos todas las capacitaciones de este tema (Match flexible)
      const capsDelTema = capacitaciones.filter((c) => {
        const temaCapNorm = normalizar(c.tema_principal);
        return temaCapNorm.includes(temaNorm) || temaNorm.includes(temaCapNorm);
      });

      // B. Obtenemos DNIs únicos que cumplieron ESTE tema
      const dnisCumplieronTema = new Set();
      capsDelTema.forEach((cap) => {
        cap.participantes.forEach((p) => {
          if (p.dni) dnisCumplieronTema.add(p.dni);
        });
      });

      // C. Iteramos las áreas objetivo DE ESTE TEMA
      datosTema.areasSet.forEach((areaNombreOriginal) => {
        // Inicializamos el área en el reporte global si no existe
        if (!areaStats[areaNombreOriginal]) {
          areaStats[areaNombreOriginal] = { meta: 0, real: 0 };
        }

        // --- CÁLCULO DE META (Trabajadores Activos del Área) ---
        const areaBuscar = normalizar(areaNombreOriginal);
        const trabajadoresDelArea = trabajadores.filter((t) =>
          normalizar(t.area).includes(areaBuscar)
        );
        const cantidadTrabajadores = trabajadoresDelArea.length;

        // Sumamos a la META GLOBAL del área
        // (Si Agrícola tiene 13 trabajadores, se suman 13 puntos de meta por este tema)
        areaStats[areaNombreOriginal].meta += cantidadTrabajadores;

        // --- CÁLCULO REAL (Trabajadores del Área que cumplieron este tema) ---
        const cumplidos = trabajadoresDelArea.filter((t) =>
          dnisCumplieronTema.has(t.dni)
        ).length;

        areaStats[areaNombreOriginal].real += cumplidos;

        // --- MANEJO DE EXTERNOS (Meta 0) ---
        if (cantidadTrabajadores === 0 && dnisCumplieronTema.size > 0) {
          // Si hubo actividad en este tema, sumamos 1 punto simbólico al real
          if (capsDelTema.length > 0) {
            areaStats[areaNombreOriginal].real += 1;
          }
        }
      });
    }

    // --- PASO 3: FORMATEAR ---
    const reporte = Object.keys(areaStats).map((areaKey) => {
      const data = areaStats[areaKey];
      const esExterno = data.meta === 0;

      let porcentaje = 0;
      if (!esExterno) {
        porcentaje =
          data.meta > 0 ? ((data.real / data.meta) * 100).toFixed(1) : 0;
      } else {
        porcentaje = data.real > 0 ? 100 : 0;
      }

      return {
        area: areaKey,
        total: data.meta,
        capacitados: data.real,
        avance: Number(porcentaje),
        tipo: esExterno ? "EXTERNO" : "INTERNO",
      };
    });

    // Ordenar
    reporte.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "INTERNO" ? -1 : 1;
      return b.avance - a.avance;
    });

    res.json(reporte);
  } catch (error) {
    console.error("Error en getDistribution:", error);
    res.status(500).json({ error: "Error al obtener distribución" });
  }
};

module.exports = { getStats, getRecent, getDistribution };
