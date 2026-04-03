// backend/src/controllers/dashboard.controller.js
const prisma = require("../utils/db");

// Función de ayuda para normalizar
const normalizar = (texto) => {
  return texto
    ? texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";
};

// --- 1. TARJETAS DE ESTADÍSTICAS (KPIs - Lógica Multitenancy) ---
const getStats = async (req, res) => {
  console.log("📊 Dashboard: getStats solicitado por", req.user);
  try {
    const { id, rol, id_empresa } = req.user;
    const role = String(rol).toLowerCase();

    // 🟢 LÓGICA EXCLUSIVA PARA SOPORTE (Global)
    if (role === "soporte") {
      const [totalEmpresas, totalAdmins, totalTrabajadores, capsHistorico] =
        await Promise.all([
          prisma.empresa.count(),
          prisma.usuarios.count({ where: { rol: "Administrador" } }),
          prisma.trabajadores.count({ where: { estado: true } }),
          prisma.capacitaciones.count(),
        ]);

      return res.json({
        totalEmpresas,
        totalAdmins,
        totalTrabajadores,
        totalCapacitaciones: capsHistorico,
        totalParticipantes: 0,
        promedioAsistencia: "0",
      });
    }

    // 🟢 LÓGICA PARA CLIENTES (Filtrado por Empresa)
    const filtro =
      role === "administrador" || role === "auditor"
        ? { id_empresa }
        : { id_empresa, creado_por: id };

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
        where: { capacitaciones: { id_empresa } }, // Aseguramos que el participante sea de una capacitación de esta empresa
        distinct: ["dni"],
        select: { id_participante: true },
      }),
      prisma.trabajadores.count({ where: { estado: true, id_empresa } }), // Solo trabajadores de esta empresa
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
    const { id, rol, id_empresa } = req.user;
    const role = String(rol).toLowerCase();

    // 🟢 SOPORTE ve todo, ADMIN/AUDITOR ven lo de su empresa, el resto ve sus propias creaciones
    const filtro =
      role === "soporte"
        ? {}
        : role === "administrador" || role === "auditor"
          ? { id_empresa }
          : { id_empresa, creado_por: id };

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
    const { id_empresa } = req.user;

    // 🟢 Solo cargamos distribución para la empresa actual
    const [planes, trabajadores, capacitaciones] = await Promise.all([
      prisma.planAnual.findMany({
        where: { id_empresa },
        select: { tema: true, areas_objetivo: true },
      }),
      prisma.trabajadores.findMany({
        where: { estado: true, id_empresa },
        select: { dni: true, area: true },
      }),
      prisma.capacitaciones.findMany({
        where: { id_empresa },
        select: {
          tema_principal: true,
          participantes: { select: { dni: true } },
        },
      }),
    ]);

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
        if (
          llave.includes("MANTENIMIENTO") ||
          llave.includes("MECANIZACION") ||
          llave.includes("TALLER")
        ) {
          llave = "TALLER - MECANIZACIÓN";
        }

        if (!areaStats[llave]) {
          areaStats[llave] = { nombre: llave, meta: 0, real: 0 };
        }

        const esTallerUbicado = llave === "TALLER - MECANIZACIÓN";
        const trabajadoresDelArea = trabajadores.filter((t) => {
          const areaT = normalizar(t.area);
          if (esTallerUbicado) {
            return (
              areaT.includes("taller") ||
              areaT.includes("mantenimiento") ||
              areaT.includes("mecanizacion")
            );
          }
          return areaT.includes(normalizar(areaNombreOriginal));
        });

        areaStats[llave].meta += trabajadoresDelArea.length;
        areaStats[llave].real += trabajadoresDelArea.filter((t) =>
          dnisCumplieronTema.has(t.dni),
        ).length;
      });
    }

    const reporte = Object.keys(areaStats).map((llave) => {
      const data = areaStats[llave];
      const esExterno = data.meta === 0;
      let porcentaje = esExterno
        ? data.real > 0
          ? 100
          : 0
        : data.meta > 0
          ? ((data.real / data.meta) * 100).toFixed(1)
          : 0;

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

// 🟢 1. Radiografía SaaS exclusiva para SOPORTE (CORREGIDA)
const getEmpresasSaaS = async (req, res) => {
  try {
    if (String(req.user.rol).toUpperCase() !== "SOPORTE") {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const empresas = await prisma.empresa.findMany({
      include: {
        usuarios: { select: { rol: true } },
        _count: { select: { trabajadores: true, capacitaciones: true } },
      },
    });

    const data = empresas.map((emp) => {
      const admins = emp.usuarios.filter(
        (u) => u.rol.toLowerCase() === "administrador",
      ).length;
      const auditores = emp.usuarios.filter(
        (u) => u.rol.toLowerCase() === "auditor",
      ).length;
      const supervisores = emp.usuarios.filter(
        (u) =>
          !["administrador", "auditor", "soporte"].includes(
            u.rol.toLowerCase(),
          ),
      ).length;

      return {
        id_empresa: emp.id_empresa,
        nombre: emp.nombre,
        ruc: emp.ruc,
        estado: emp.estado, // 🟢 FIX: Ahora lee el estado REAL de la Base de Datos
        admins,
        auditores,
        supervisores,
        total_trabajadores: emp._count.trabajadores,
        total_capacitaciones: emp._count.capacitaciones,
      };
    });

    res.json(data);
  } catch (error) {
    console.error("Error en getEmpresasSaaS:", error);
    res.status(500).json({ error: "Error al obtener datos SaaS" });
  }
};

const toggleEstadoEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const actualizada = await prisma.empresa.update({
      where: { id_empresa: Number(id) },
      data: { estado: Boolean(estado) },
    });

    res.json({
      mensaje: `Empresa ${estado ? "activada" : "suspendida"}`,
      data: actualizada,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado" });
  }
};

// 🟢 2. Obtener datos básicos de una empresa específica (CORREGIDA)
const getEmpresaById = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { id_empresa: Number(id) },
      include: {
        _count: { select: { capacitaciones: true, trabajadores: true } }, // 🟢 FIX: Aseguramos que cuente las capacitaciones
      },
    });

    if (!empresa)
      return res.status(404).json({ error: "Empresa no encontrada" });

    res.json(empresa);
  } catch (error) {
    console.error("Error en getEmpresaById:", error);
    res.status(500).json({ error: "Error al obtener empresa" });
  }
};

// Obtener los usuarios de esa empresa específica
const getUsuariosByEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarios = await prisma.usuarios.findMany({
      where: { id_empresa: Number(id) },
      select: {
        id_usuario: true,
        nombre: true,
        usuario: true,
        rol: true,
        email: true,
        estado: true,
      },
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

module.exports = {
  getStats,
  getRecent,
  getDistribution,
  getEmpresasSaaS,
  getEmpresaById,
  getUsuariosByEmpresa,
  toggleEstadoEmpresa,
};
