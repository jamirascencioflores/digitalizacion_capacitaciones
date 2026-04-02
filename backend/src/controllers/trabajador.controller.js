// backend/src/controllers/trabajador.controller.js

const prisma = require("../utils/db");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");
// 🟢 1. IMPORTAMOS LA UTILIDAD DE FIREBASE
const {
  uploadFromBuffer,
  uploadFromBase64,
} = require("../utils/uploadToFirebase");

// 1. LISTAR TODOS (Filtrado por Empresa)
const obtenerTrabajadores = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const id_empresa = req.user?.id_empresa;

    // 🟢 NUEVO: SOPORTE ve todo, el resto ve solo su empresa
    const filtro = rol === "SOPORTE" ? {} : { id_empresa };

    const trabajadores = await prisma.trabajadores.findMany({
      where: filtro,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    });
    res.json(trabajadores);
  } catch (error) {
    console.error("Error al listar:", error);
    res.status(500).json({ error: "Error al listar trabajadores" });
  }
};

const getTrabajadoresSelect = async (req, res) => {
  try {
    const rol = req.user?.rol;
    const id_empresa = req.user?.id_empresa;

    // 🟢 NUEVO: Aplicamos el filtro también aquí
    const filtro =
      rol === "SOPORTE" ? { estado: true } : { estado: true, id_empresa };

    const trabajadores = await prisma.trabajadores.findMany({
      where: filtro,
      select: {
        dni: true,
        nombres: true,
        apellidos: true,
        area: true,
        cargo: true,
        genero: true,
        firma_url: true,
        categoria: true,
      },
      orderBy: { apellidos: "asc" },
    });
    res.json(trabajadores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar trabajadores" });
  }
};

// 2. BUSCAR POR DNI
const buscarPorDNI = async (req, res) => {
  try {
    const { dni } = req.params;
    const trabajador = await prisma.trabajadores.findUnique({
      where: { dni },
    });
    if (!trabajador) return res.status(404).json({ error: "No encontrado" });
    res.json(trabajador);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar" });
  }
};

// 🟢 3. GUARDAR (CREAR O ACTUALIZAR)
const guardarTrabajador = async (req, res) => {
  try {
    // Agregamos id_empresa por si SOPORTE lo manda en el formulario
    const {
      dni,
      nombres,
      apellidos,
      area,
      cargo,
      genero,
      firma_url,
      id_empresa,
    } = req.body;

    if (!nombres || !apellidos) {
      return res
        .status(400)
        .json({ error: "Se requieren nombres y apellidos por separado." });
    }

    // 🟢 NUEVO: Determinar a qué empresa pertenece el nuevo trabajador
    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa
        ? Number(id_empresa)
        : req.user?.id_empresa || 1;

    let urlFinal = firma_url;

    if (firma_url && firma_url.startsWith("data:image")) {
      console.log("✍️ Subiendo firma dibujada...");
      const upload = await uploadFromBase64(firma_url, "firmas_trabajadores");
      urlFinal = upload.secure_url;
    }

    if (req.file) {
      console.log("📤 Subiendo firma como archivo...");
      const upload = await uploadFromBuffer(
        req.file.buffer,
        "firmas_trabajadores",
      );
      urlFinal = upload.secure_url;
    }

    const trabajador = await prisma.trabajadores.upsert({
      where: { dni },
      update: {
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal,
      },
      create: {
        dni,
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal,
        id_empresa: empresaDestino, // 🟢 NUEVO: Lo vinculamos a la empresa
      },
    });

    res.json(trabajador);
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ error: "Error al guardar trabajador" });
  }
};

// 4. ELIMINAR
const eliminarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.delete({
      where: { id_trabajador: Number(id) },
    });
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({
      error: "Error al eliminar. Puede tener capacitaciones asociadas.",
    });
  }
};

// 5. CARGA MASIVA DE FIRMAS
const cargaMasivaFirmas = async (req, res) => {
  try {
    const archivos = req.files; // Ahora son buffers en memoria

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ error: "No se enviaron archivos." });
    }

    // 🟢 NUEVO: Determinar la empresa para la ruta de Firebase
    const { id_empresa } = req.body;
    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa
        ? Number(id_empresa)
        : req.user?.id_empresa || 1;

    // 🟢 NUEVO: Construir la ruta dinámica
    const folderPath = `empresas/empresa_${empresaDestino}/firmas_trabajadores`;

    let actualizados = 0;
    let errores = 0;

    for (const archivo of archivos) {
      try {
        const nombreOriginal = archivo.originalname;
        const dniExtraido = path.parse(nombreOriginal).name;

        if (/^\d{8}$/.test(dniExtraido)) {
          // 🟢 Subir a Firebase en la ruta de la empresa
          const result = await uploadFromBuffer(
            archivo.buffer,
            folderPath,
            archivo.originalname,
          );
          const urlPublica = result.secure_url;

          // Actualizamos asegurando que el trabajador sea de esa empresa
          const resultado = await prisma.trabajadores.updateMany({
            where: {
              dni: dniExtraido,
              id_empresa: empresaDestino, // Candado de seguridad Multi-Tenant
            },
            data: { firma_url: urlPublica },
          });

          if (resultado.count > 0) {
            actualizados++;
          } else {
            errores++;
          }
        } else {
          errores++;
        }
      } catch (err) {
        console.error(err);
        errores++;
      }
    }

    res.json({
      mensaje: "Proceso masivo finalizado",
      total_procesados: archivos.length,
      actualizados_correctamente: actualizados,
      no_encontrados_o_error: errores,
    });
  } catch (error) {
    console.error("Error masivo:", error);
    res.status(500).json({ error: "Error en la carga masiva" });
  }
};

// 🟢 6. IMPORTAR EXCEL INTELIGENTE (MEJORADO PARA PATERNO + MATERNO)
const importarExcelInteligente = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Sube un archivo Excel (.xlsx)" });

    // 🟢 NUEVO: Determinar empresa para todos los trabajadores del Excel
    const id_empresa_body = req.body.id_empresa;
    const empresaDestino =
      req.user?.rol === "SOPORTE" && id_empresa_body
        ? Number(id_empresa_body)
        : req.user?.id_empresa || 1;

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2)
      return res.status(400).json({ error: "El Excel está vacío" });

    const headers = rawData[0].map((h) =>
      String(h)
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );
    const findCol = (keywords) =>
      headers.findIndex((h) => keywords.some((k) => h.includes(k)));

    const idxDNI = findCol(["dni", "documento", "cedula", "codigogeneral"]);
    const idxNombres = findCol(["nombres", "nombre", "colaborador"]);
    const idxApellidosGeneral = findCol(["apellidos", "apellido"]);
    const idxPaterno = findCol(["paterno"]);
    const idxMaterno = findCol(["materno"]);
    const idxArea = findCol([
      "area",
      "unidad",
      "departamento",
      "seccion",
      "subplanilla",
    ]);
    const idxCargo = findCol(["cargo", "puesto", "ocupacion"]);
    const idxGenero = findCol(["genero", "sexo"]);
    const idxCategoria = findCol(["categoria", "grupo"]);

    if (idxDNI === -1)
      return res.status(400).json({ error: "No encontré columna DNI" });

    let procesados = 0;
    let errores = 0;

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      let dni = row[idxDNI];
      if (dni) dni = String(dni).replace(/\D/g, "").padStart(8, "0");
      if (!dni || dni.length < 8) {
        errores++;
        continue;
      }

      let nombres = "SIN NOMBRE";
      let apellidos = "SIN APELLIDO";

      if (idxNombres !== -1) nombres = row[idxNombres] || nombres;

      if (idxPaterno !== -1 && idxMaterno !== -1) {
        const p = String(row[idxPaterno] || "").trim();
        const m = String(row[idxMaterno] || "").trim();
        apellidos = `${p} ${m}`.trim();
      } else if (idxApellidosGeneral !== -1) {
        apellidos = String(row[idxApellidosGeneral] || "").trim();
        if (apellidos === "" && idxNombres !== -1) {
          const completo = String(row[idxNombres]).trim();
          if (completo.includes(",")) {
            apellidos = completo.split(",")[0].trim();
            nombres = completo.split(",")[1].trim();
          }
        }
      } else if (idxPaterno !== -1) {
        apellidos = String(row[idxPaterno] || "").trim();
      }

      if (!apellidos) apellidos = "SIN APELLIDO";

      const area =
        idxArea !== -1 ? String(row[idxArea] || "General").trim() : "General";
      const cargo =
        idxCargo !== -1
          ? String(row[idxCargo] || "Trabajador").trim()
          : "Trabajador";
      const categoria =
        idxCategoria !== -1 ? String(row[idxCategoria] || "").trim() : null;

      let genero = "M";
      if (idxGenero !== -1) {
        const gRaw = String(row[idxGenero]).toUpperCase();
        if (gRaw.startsWith("F") || gRaw.includes("MUJER")) genero = "F";
      }

      try {
        await prisma.trabajadores.upsert({
          where: { dni },
          update: { nombres, apellidos, area, cargo, genero, categoria },
          create: {
            dni,
            nombres,
            apellidos,
            area,
            cargo,
            genero,
            categoria,
            estado: true,
            id_empresa: empresaDestino, // 🟢 NUEVO: Inyectamos la empresa aquí
          },
        });
        procesados++;
      } catch (e) {
        errores++;
      }
    }

    res.json({ mensaje: "Importación finalizada", procesados, errores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando Excel" });
  }
};

// 7. ELIMINAR FIRMA
const eliminarFirma = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.update({
      where: { id_trabajador: Number(id) },
      data: { firma_url: null },
    });
    res.json({ mensaje: "Firma eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar firma" });
  }
};

// 🟢 8. ACTUALIZAR TRABAJADOR (CON FIRMA)
const actualizarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_trabajador, ...datos } = req.body;

    // Si viene nueva imagen, la subimos
    if (req.file) {
      console.log("📤 Actualizando firma en Firebase...");
      const result = await uploadFromBuffer(
        req.file.buffer,
        "firmas_trabajadores",
        req.file.originalname,
      );
      datos.firma_url = result.secure_url;
    }

    const trabajadorActualizado = await prisma.trabajadores.update({
      where: { id_trabajador: parseInt(id) },
      data: datos,
    });

    return res.json(trabajadorActualizado);
  } catch (error) {
    console.error("Error actualizando trabajador:", error);
    return res.status(500).json({ message: "Error al actualizar trabajador" });
  }
};

module.exports = {
  obtenerTrabajadores,
  buscarPorDNI,
  guardarTrabajador,
  eliminarTrabajador,
  cargaMasivaFirmas,
  getTrabajadoresSelect,
  importarExcelInteligente,
  eliminarFirma,
  actualizarTrabajador,
};
