const prisma = require("../utils/db");

class CapacitacionService {
  /**
   * Obtiene todas las capacitaciones filtradas por rol/usuario y EMPRESA
   */
  async getAll(id_auth, rol_auth, id_empresa) {
    const rol = String(rol_auth || "").toLowerCase();
    let filtro = {};

    // 🟢 NUEVO: Lógica SaaS
    if (rol !== "soporte") {
      filtro.id_empresa = id_empresa; // Aislamiento por cliente

      // Si no es admin/auditor, solo ve las suyas
      if (rol !== "administrador" && rol !== "auditor") {
        filtro.creado_por = Number(id_auth);
      }
    }

    return await prisma.capacitaciones.findMany({
      where: filtro,
      orderBy: { fecha: "desc" },
      include: {
        usuarios: { select: { nombre: true } },
        documentos: { select: { id_documento: true, url: true, tipo: true } },
      },
    });
  }

  /**
   * Crea una nueva capacitación con sus relaciones
   */
  async create(data, usuarioId, idEmpresa) {
    // 🟢 Extraemos participantes, documentos, y limpiamos posibles id_empresa/idEmpresa colados en "data"
    const {
      participantes,
      documentos,
      id_empresa,
      idEmpresa: _idE,
      ...resto
    } = data;

    // Determinamos el ID real de la empresa (preferimos el argumento directo del controlador, luego los que vengan en data)
    const empresaId = Number(idEmpresa || id_empresa || _idE);

    return await prisma.capacitaciones.create({
      data: {
        ...resto,
        // 🟢 Conectamos el usuario creador
        usuarios: {
          connect: { id_usuario: Number(usuarioId) },
        },
        // 🟢 Conectamos la empresa correctamente
        empresa: {
          connect: { id_empresa: empresaId },
        },
        documentos: {
          create: documentos || [],
        },
        participantes: {
          create: (participantes || []).map((p, i) => ({
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
  }

  /**
   * Obtiene detalle y calcula cobertura
   */
  async getById(id) {
    const capacitacion = await prisma.capacitaciones.findFirst({
      where: { id_capacitacion: Number(id) },
      include: {
        participantes: true,
        documentos: true,
        evaluaciones: {
          include: {
            preguntas: {
              include: { opciones: true },
            },
          },
        },
      },
    });

    if (!capacitacion) return null;

    // 🟢 PROTECCIÓN 1: (str || "") evita el crasheo si el texto es nulo o indefinido
    const normalizar = (str) =>
      (str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    let faltantes = [];
    let cobertura = { total_objetivo: 0, asistentes: 0, porcentaje: 0 };

    if (capacitacion.area_objetivo) {
      const areasParaBuscar = capacitacion.area_objetivo
        .split(",")
        .map(normalizar);

      // Solo buscar en los trabajadores de ESTA empresa
      const todosTrabajadores = await prisma.trabajadores.findMany({
        where: {
          estado: true,
          id_empresa: capacitacion.id_empresa,
        },
      });

      const trabajadoresObjetivo = todosTrabajadores.filter((t) => {
        const areaT = normalizar(t.area);
        return areasParaBuscar.some((areaCap) => {
          if (
            ["mantenimiento", "taller", "mecanizacion"].some((k) =>
              areaCap.includes(k),
            )
          ) {
            return ["mantenimiento", "taller", "mecanizacion"].some((k) =>
              areaT.includes(k),
            );
          }
          return areaT.includes(areaCap);
        });
      });

      // 🟢 PROTECCIÓN 2: Validamos si t.dni y p.dni existen antes de hacer .trim()
      const dnisObjetivo = new Set(
        trabajadoresObjetivo.map((t) => (t.dni ? t.dni.trim() : "")),
      );
      const asistentesValidos = capacitacion.participantes.filter((p) =>
        dnisObjetivo.has(p.dni ? p.dni.trim() : ""),
      );
      const asistentesDNI = new Set(
        asistentesValidos.map((p) => (p.dni ? p.dni.trim() : "")),
      );

      faltantes = trabajadoresObjetivo.filter(
        (t) => !asistentesDNI.has(t.dni ? t.dni.trim() : ""),
      );

      cobertura.total_objetivo = trabajadoresObjetivo.length;
      cobertura.asistentes = asistentesDNI.size;
      cobertura.porcentaje =
        cobertura.total_objetivo > 0
          ? Math.round((cobertura.asistentes / cobertura.total_objetivo) * 100)
          : 0;
    }

    return { ...capacitacion, faltantes, cobertura };
  }

  /**
   * Actualización compleja con backup de firmas
   */
  async update(id, data) {
    // 🟢 Limpiamos datos prohibidos en "update" para evitar otro PrismaClientValidationError
    const {
      participantes,
      nuevosDocumentos,
      id_empresa,
      idEmpresa,
      id_capacitacion,
      ...resto
    } = data;

    // 1. Backup de firmas
    const antiguos = await prisma.participantes.findMany({
      where: { id_capacitacion: Number(id) },
      select: { dni: true, firma_url: true },
    });
    const mapaFirmas = new Map(
      antiguos.map((p) => [p.dni?.trim(), p.firma_url]),
    );

    // 2. Actualizar datos base
    const actualizada = await prisma.capacitaciones.update({
      where: { id_capacitacion: Number(id) },
      data: {
        ...resto,
        documentos: { create: nuevosDocumentos || [] },
      },
    });

    // 3. Re-crear participantes
    await prisma.participantes.deleteMany({
      where: { id_capacitacion: Number(id) },
    });

    if (participantes?.length > 0) {
      const paraCrear = participantes.map((p, i) => ({
        id_capacitacion: Number(id),
        numero: i + 1,
        dni: p.dni?.trim(),
        apellidos_nombres: p.apellidos_nombres,
        area: p.area,
        cargo: p.cargo,
        genero: p.genero || "M",
        firma_url: p.firma_url || mapaFirmas.get(p.dni?.trim()) || null,
        condicion: p.condicion || null,
      }));

      await prisma.participantes.createMany({ data: paraCrear });
    }

    return actualizada;
  }

  async delete(id) {
    return await prisma.capacitaciones.delete({
      where: { id_capacitacion: Number(id) },
    });
  }

  async deleteDocument(id) {
    return await prisma.documentos.delete({
      where: { id_documento: Number(id) },
    });
  }
}

module.exports = new CapacitacionService();
