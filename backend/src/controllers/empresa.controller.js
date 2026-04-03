// backend/src/controllers/empresa.controller.js
const prisma = require("../utils/db");

// 🟢 NUEVO: Crear una empresa (Exclusivo de SOPORTE)
const crearEmpresa = async (req, res) => {
  try {
    if (String(req.user.rol).toUpperCase() !== "SOPORTE") {
      return res
        .status(403)
        .json({ error: "Acceso denegado: Solo soporte puede crear empresas" });
    }

    const {
      nombre,
      ruc,
      direccion_principal,
      sedes_adicionales, // 🟢 Recibimos el array ["Sede 1", "Sede 2"]
      actividad_economica,
      codigo_formato,
      revision_actual,
    } = req.body;

    const nuevaEmpresa = await prisma.empresa.create({
      data: {
        nombre,
        ruc,
        direccion_principal: direccion_principal || "Sede Principal",
        sedes_adicionales: sedes_adicionales || [], // 🟢 Guardamos el array como JSON
        actividad_economica: actividad_economica || "General",
        codigo_formato: codigo_formato || "FOR-SST-01",
        revision_actual: revision_actual || "00",
        estado: true,
      },
    });

    res
      .status(201)
      .json({ mensaje: "Empresa creada exitosamente", data: nuevaEmpresa });
  } catch (error) {
    console.error("Error al crear empresa:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "El RUC ingresado ya está registrado en el sistema." });
    }
    res.status(500).json({ error: "Error al crear la empresa" });
  }
};

// Obtener la configuración actual (Modificado para SaaS)
const obtenerConfiguracion = async (req, res) => {
  try {
    // Si la petición viene sin token (ej. landing page pública), enviamos la principal (id: 1)
    const id_empresa = req.user?.id_empresa || 1;

    let empresa = await prisma.empresa.findUnique({
      where: { id_empresa: id_empresa },
    });

    if (!empresa && id_empresa === 1) {
      empresa = await prisma.empresa.create({
        data: {
          nombre: "Mi Empresa SaaS",
          ruc: "00000000000",
          actividad_economica: "Sistemas",
          codigo_formato: "01",
          revision_actual: "0",
        },
      });
    }

    res.json(empresa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener datos de empresa" });
  }
};

// Actualizar configuración general
const actualizarConfiguracion = async (req, res) => {
  try {
    const { id_empresa, ...datos } = req.body;
    // Obligamos a que actualice solo SU empresa
    const targetId =
      req.user.rol === "SOPORTE" ? Number(id_empresa) : req.user.id_empresa;

    const actualizada = await prisma.empresa.update({
      where: { id_empresa: targetId },
      data: datos,
    });
    res.json({ mensaje: "Configuración actualizada", data: actualizada });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar" });
  }
};

// Función dinámica para ambos botones del Bot
const toggleBotGlobal = async (req, res) => {
  try {
    const { tipo, estado } = req.body;
    // El bot generalmente se asocia a la empresa principal o la que esté en sesión
    const id_empresa = req.user?.id_empresa || 1;

    const dataToUpdate = {};
    if (tipo === "publico") dataToUpdate.bot_activo = Boolean(estado);
    if (tipo === "interno") dataToUpdate.bot_interno_activo = Boolean(estado);

    const actualizada = await prisma.empresa.update({
      where: { id_empresa: id_empresa },
      data: dataToUpdate,
    });

    res.json({ mensaje: "Estado del bot actualizado", data: actualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el bot" });
  }
};

const { uploadFromBuffer } = require("../utils/uploadToFirebase");

const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    // 🟢 Aseguramos atrapar direccion_principal y sedes_adicionales
    const {
      nombre,
      ruc,
      direccion_principal,
      codigo_formato,
      sedes_adicionales,
    } = req.body;

    let updateData = {
      nombre,
      ruc,
      direccion_principal, // 🟢 Guardando con el nombre correcto de la BD
      codigo_formato,
    };

    // 🟢 Procesar las sedes (De String a JSON Array)
    if (sedes_adicionales) {
      updateData.sedes_adicionales = JSON.parse(sedes_adicionales);
    }

    if (req.file) {
      const folderPath = `empresas/empresa_${id}/logo`;
      const resultadoFirebase = await uploadFromBuffer(
        req.file.buffer,
        folderPath,
        req.file.originalname,
      );
      updateData.logo_url = resultadoFirebase.secure_url;
    }

    const empresaActualizada = await prisma.empresa.update({
      where: { id_empresa: Number(id) },
      data: updateData,
    });

    res.json(empresaActualizada);
  } catch (error) {
    console.error("Error al actualizar empresa:", error);
    res.status(500).json({ error: "Error al actualizar la empresa" });
  }
};

// 🟢 NUEVA FUNCIÓN: Cambiar estado de la empresa (Activa/Suspendida)
const toggleEstadoEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const empresaActualizada = await prisma.empresa.update({
      where: { id_empresa: Number(id) },
      data: { estado: Boolean(estado) },
    });

    res.json(empresaActualizada);
  } catch (error) {
    console.error("Error al cambiar estado de empresa:", error);
    res.status(500).json({ error: "Error al actualizar el estado" });
  }
};

const obtenerSedesEmpresa = async (req, res) => {
  try {
    const idEmpresa = req.user.id_empresa;

    const empresa = await prisma.empresa.findUnique({
      where: { id_empresa: idEmpresa },
      select: {
        nombre: true,
        direccion_principal: true,
        sedes_adicionales: true,
      },
    });

    if (!empresa)
      return res.status(404).json({ error: "Empresa no encontrada" });

    const sedesJson = empresa.sedes_adicionales
      ? typeof empresa.sedes_adicionales === "string"
        ? JSON.parse(empresa.sedes_adicionales)
        : empresa.sedes_adicionales
      : [];

    const todasLasSedes = [empresa.direccion_principal, ...sedesJson].filter(
      Boolean,
    );

    // 🟢 DEVOLVEMOS UN OBJETO CON EL NOMBRE Y LAS SEDES
    res.json({
      nombreEmpresa: empresa.nombre,
      sedes: todasLasSedes,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sedes" });
  }
};

// Actualiza tu module.exports:
module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
  toggleBotGlobal,
  crearEmpresa,
  actualizarEmpresa,
  toggleEstadoEmpresa,
  obtenerSedesEmpresa,
};
