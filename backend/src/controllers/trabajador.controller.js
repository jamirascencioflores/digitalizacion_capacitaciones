// backend/src/controllers/trabajador.controller.js

const prisma = require("../utils/db");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");
// 🟢 1. IMPORTAMOS LA UTILIDAD DE CLOUDINARY
const { uploadImage } = require("../utils/cloudinary");

// 1. LISTAR TODOS
const obtenerTrabajadores = async (req, res) => {
  try {
    const trabajadores = await prisma.trabajadores.findMany({
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
    const trabajadores = await prisma.trabajadores.findMany({
      where: { estado: true },
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

// 🟢 3. GUARDAR (CREAR O ACTUALIZAR) - CON CLOUDINARY
const guardarTrabajador = async (req, res) => {
  try {
    const { dni, nombres, apellidos, area, cargo, genero, firma_url } =
      req.body;

    if (!nombres || !apellidos) {
      return res
        .status(400)
        .json({ error: "Se requieren nombres y apellidos por separado." });
    }

    // Lógica de Imagen:
    // Si viene un archivo (req.file), lo subimos y usamos esa URL.
    // Si no viene archivo, usamos el firma_url que venga en el body (o null).
    let urlFinal = firma_url;

    if (req.file) {
      console.log("📤 Subiendo firma a Cloudinary...");
      const result = await uploadImage(req.file.buffer, "firmas_trabajadores");
      urlFinal = result.secure_url;
      console.log("✅ Firma subida:", urlFinal);
    }

    const trabajador = await prisma.trabajadores.upsert({
      where: { dni },
      update: {
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal, // Usamos la URL (nueva o existente)
      },
      create: {
        dni,
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url: urlFinal,
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
// NOTA: Esta función requiere un ajuste mayor si usas Cloudinary para muchas fotos.
// Por ahora la dejamos funcional para memoria, pero subirá las fotos una por una.
const cargaMasivaFirmas = async (req, res) => {
  try {
    const archivos = req.files; // Ahora son buffers en memoria

    if (!archivos || archivos.length === 0) {
      return res.status(400).json({ error: "No se enviaron archivos." });
    }

    let actualizados = 0;
    let errores = 0;

    for (const archivo of archivos) {
      try {
        const nombreOriginal = archivo.originalname;
        const dniExtraido = path.parse(nombreOriginal).name;

        if (/^\d{8}$/.test(dniExtraido)) {
          // Subir a Cloudinary
          const result = await uploadImage(
            archivo.buffer,
            "firmas_trabajadores",
          );
          const urlPublica = result.secure_url;

          const resultado = await prisma.trabajadores.updateMany({
            where: { dni: dniExtraido },
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

    // Leemos el buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2)
      return res.status(400).json({ error: "El Excel está vacío" });

    // FILA 0: CABECERAS
    const headers = rawData[0].map((h) =>
      String(h)
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );

    const findCol = (keywords) =>
      headers.findIndex((h) => keywords.some((k) => h.includes(k)));

    // --- DICCIONARIO DE COLUMNAS ---
    const idxDNI = findCol(["dni", "documento", "cedula", "codigogeneral"]);
    const idxNombres = findCol(["nombres", "nombre", "colaborador"]);

    // 🔍 CAMBIO CLAVE: Buscamos 3 tipos de columnas de apellidos
    const idxApellidosGeneral = findCol(["apellidos", "apellido"]); // Columna única "Apellidos"
    const idxPaterno = findCol(["paterno"]); // Columna específica "Paterno"
    const idxMaterno = findCol(["materno"]); // Columna específica "Materno"

    const idxArea = findCol(["area", "unidad", "departamento", "seccion"]);
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

      // 1. OBTENER NOMBRES
      if (idxNombres !== -1) nombres = row[idxNombres] || nombres;

      // 2. LOGICA INTELIGENTE DE APELLIDOS (AQUÍ ESTÁ EL ARREGLO) 🧠
      if (idxPaterno !== -1 && idxMaterno !== -1) {
        // CASO A: Existen columnas separadas (Paterno y Materno) -> LAS UNIMOS
        const p = String(row[idxPaterno] || "").trim();
        const m = String(row[idxMaterno] || "").trim();
        apellidos = `${p} ${m}`.trim();
      } else if (idxApellidosGeneral !== -1) {
        // CASO B: Existe una sola columna "Apellidos" -> USAMOS ESA
        apellidos = String(row[idxApellidosGeneral] || "").trim();

        // Si por casualidad la columna "Nombres" incluye los apellidos (formato: APELLIDOS, NOMBRES)
        if (apellidos === "" && idxNombres !== -1) {
          const completo = String(row[idxNombres]).trim();
          if (completo.includes(",")) {
            apellidos = completo.split(",")[0].trim();
            nombres = completo.split(",")[1].trim();
          }
        }
      } else if (idxPaterno !== -1) {
        // CASO C: Solo existe Paterno
        apellidos = String(row[idxPaterno] || "").trim();
      }

      // Evitamos guardar "SIN APELLIDO" si logramos conseguir algo
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
      console.log("📤 Actualizando firma en Cloudinary...");
      const result = await uploadImage(req.file.buffer, "firmas_trabajadores");
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
