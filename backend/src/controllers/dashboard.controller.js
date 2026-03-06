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
  console.log("📊 Dashboard: getStats solicitado por", req.user);
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
        1,
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
  console.log("🕒 Dashboard: getRecent solicitado por", req.user);
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

// --- 3. DISTRIBUCIÓN (LÓGICA OPTIMIZADA) ---
const getDistribution = async (req, res) => {
  console.log("Dashboard: Calculando distribución por áreas");
  try {
    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany({
        select: { tema: true, areas_objetivo: true }
      }),
      prisma.trabajadores.findMany({
        where: { estado: true },
        select: { dni: true, area: true }
      }),
      prisma.capacitaciones.findMany({
        select: {
          tema_principal: true,
          participantes: { select: { dni: true } }
        },
      }),
    ]);

    // ... (rest of the logic remains similar but now with less memory consumption)
    const temasUnicosMap = {};

    planes.forEach((plan) => {
      if (!plan.areas_objetivo) return;
      const temaNorm = normalizar(plan.tema);
      const areasRow = plan.areas_objetivo.split(",").map((a) => a.trim());

      if (!temasUnicosMap[temaNorm]) {
        temasUnicosMap[temaNorm] = {
          nombreOriginal: plan.tema,
          areasSet: new Set(),
        };
      }
      areasRow.forEach((area) => {
        if (area) temasUnicosMap[temaNorm].areasSet.add(area);
      });
    });

    const areaStats = {};

    for (const [temaNorm, datosTema] of Object.entries(temasUnicosMap)) {
      const capsDelTema = capacitaciones.filter((c) => {
        const temaCapNorm = normalizar(c.tema_principal);
        return temaCapNorm.includes(temaNorm) || temaNorm.includes(temaCapNorm);
      });

      const dnisCumplieronTema = new Set();
      capsDelTema.forEach((cap) => {
        cap.participantes.forEach((p) => {
          if (p.dni) dnisCumplieronTema.add(p.dni);
        });
      });

      datosTema.areasSet.forEach((areaNombreOriginal) => {
        let llave = areaNombreOriginal.trim().toUpperCase();
        if (llave.includes("MANTENIMIENTO") || llave.includes("MECANIZACION") || llave.includes("TALLER")) {
          llave = "TALLER - MECANIZACIÓN";
        }

        if (!areaStats[llave]) {
          areaStats[llave] = { nombre: llave, meta: 0, real: 0 };
        }

        const esTallerUbicado = llave === "TALLER - MECANIZACIÓN";
        const trabajadoresDelArea = trabajadores.filter((t) => {
          const areaT = normalizar(t.area);
          if (esTallerUbicado) {
            return areaT.includes("taller") || areaT.includes("mantenimiento") || areaT.includes("mecanizacion");
          }
          return areaT.includes(normalizar(areaNombreOriginal));
        });

        areaStats[llave].meta += trabajadoresDelArea.length;
        areaStats[llave].real += trabajadoresDelArea.filter((t) => dnisCumplieronTema.has(t.dni)).length;
      });
    }

    const reporte = Object.keys(areaStats).map((llave) => {
      const data = areaStats[llave];
      const esExterno = data.meta === 0;
      let porcentaje = esExterno ? (data.real > 0 ? 100 : 0) : (data.meta > 0 ? ((data.real / data.meta) * 100).toFixed(1) : 0);

      return {
        area: data.nombre,
        total: data.meta,
        capacitados: data.real,
        avance: Number(porcentaje),
        tipo: esExterno ? "EXTERNO" : "INTERNO",
      };
    });

    reporte.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "INTERNO" ? -1 : 1;
      return b.avance - a.avance;
    });

    res.json(reporte);
  } catch (error) {
    console.error(`Error en getDistribution: ${error.message}`);
    res.status(500).json({ error: "Error al obtener distribución" });
  }
};


module.exports = { getStats, getRecent, getDistribution };
