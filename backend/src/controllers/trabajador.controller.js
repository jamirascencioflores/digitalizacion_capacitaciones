// backend/src/controllers/trabajador.controller.js

const prisma = require("../utils/db");
const path = require("path");
const XLSX = require("xlsx"); // Asegúrate de tener: npm install xlsx
const fs = require("fs");
const { parsearExcelNisira } = require("../utils/nisiraParser");

// 1. LISTAR TODOS
const obtenerTrabajadores = async (req, res) => {
  try {
    // CORRECCIÓN: Ordenamos por apellidos y luego nombres, ya que el campo unificado no existe
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

// 3. GUARDAR (CREAR O ACTUALIZAR)
const guardarTrabajador = async (req, res) => {
  try {
    // CORRECCIÓN IMPORTANTE:
    // Debes recibir 'nombres' y 'apellidos' por separado desde el Frontend.
    // Si tu frontend envía 'apellidos_nombres', tendrás que separarlo aquí manualmente.
    const { dni, nombres, apellidos, area, cargo, genero, firma_url } =
      req.body;

    // Validación simple para evitar guardar nulos si el frontend falla
    if (!nombres || !apellidos) {
      return res
        .status(400)
        .json({ error: "Se requieren nombres y apellidos por separado." });
    }

    const trabajador = await prisma.trabajadores.upsert({
      where: { dni },
      update: {
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url,
      },
      create: {
        dni,
        nombres,
        apellidos,
        area,
        cargo,
        genero,
        firma_url,
      },
    });

    res.json(trabajador);
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ error: "Error al guardar trabajador" });
  }
};

// 4. ELIMINAR (Sin cambios, esto estaba bien)
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

// 5. CARGA MASIVA DE FIRMAS (Prácticamente igual, solo verifica que use el modelo correcto)
const cargaMasivaFirmas = async (req, res) => {
  try {
    const archivos = req.files;

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
          const urlPublica = `${req.protocol}://${req.get("host")}/uploads/${
            archivo.filename
          }`;

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

// 🟢 6. IMPORTAR EXCEL INTELIGENTE (NUEVO)
const importarExcelInteligente = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Sube un archivo Excel (.xlsx)" });

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertimos a JSON crudo (array de arrays)
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Borramos el archivo temporal
    fs.unlinkSync(filePath);

    if (rawData.length < 2)
      return res.status(400).json({ error: "El Excel está vacío" });

    // FILA 0: CABECERAS (Detectamos sinónimos)
    const headers = rawData[0].map((h) =>
      String(h)
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );

    // Función para buscar índice de columna por palabras clave
    const findCol = (keywords) =>
      headers.findIndex((h) => keywords.some((k) => h.includes(k)));

    // DICCIONARIO DE SINÓNIMOS
    const idxDNI = findCol([
      "dni",
      "documento",
      "cedula",
      "codigogeneral",
      "idcodigo",
    ]);
    const idxNombres = findCol([
      "nombres",
      "nombre",
      "colaborador",
      "empleado",
    ]); // Si viene junto, usaremos lógica de split
    const idxApellidos = findCol(["apellidos", "apellido", "paterno"]);
    const idxArea = findCol([
      "area",
      "unidad",
      "departamento",
      "seccion",
      "centro costo",
    ]);
    const idxCargo = findCol(["cargo", "puesto", "ocupacion", "labor"]);
    const idxGenero = findCol(["genero", "sexo"]);

    if (idxDNI === -1)
      return res
        .status(400)
        .json({ error: "No encontré columna DNI (o Código General)" });

    let procesados = 0;
    let errores = 0;

    // ITERAR FILAS (Desde la fila 1, ignorando cabecera)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      let dni = row[idxDNI];
      // Limpieza DNI: solo números y ceros a la izquierda
      if (dni) dni = String(dni).replace(/\D/g, "").padStart(8, "0");

      if (!dni || dni.length < 8) {
        errores++;
        continue;
      }

      // Lógica Nombres y Apellidos
      let nombres = "SIN NOMBRE";
      let apellidos = "SIN APELLIDO";

      if (idxNombres !== -1 && idxApellidos !== -1) {
        // Caso ideal: Columnas separadas
        nombres = row[idxNombres] || nombres;
        apellidos = row[idxApellidos] || apellidos;
      } else if (idxNombres !== -1) {
        // Caso difícil: Nombre completo en una sola celda (Ej: "PEREZ LOPEZ, JUAN")
        const completo = String(row[idxNombres]).trim();
        if (completo.includes(",")) {
          // Formato: APELLIDOS, NOMBRES
          const partes = completo.split(",");
          apellidos = partes[0].trim();
          nombres = partes[1].trim();
        } else {
          // Formato: NOMBRES APELLIDOS (Adivinanza simple)
          const partes = completo.split(" ");
          if (partes.length > 2) {
            apellidos = partes.slice(-2).join(" "); // Últimos 2 son apellidos
            nombres = partes.slice(0, -2).join(" ");
          } else {
            nombres = partes[0];
            apellidos = partes.slice(1).join(" ");
          }
        }
      }

      const area =
        idxArea !== -1 ? String(row[idxArea] || "General").trim() : "General";
      const cargo =
        idxCargo !== -1
          ? String(row[idxCargo] || "Trabajador").trim()
          : "Trabajador";

      // Género (Intentar detectar M/F)
      let genero = "M";
      if (idxGenero !== -1) {
        const gRaw = String(row[idxGenero]).toUpperCase();
        if (gRaw.startsWith("F") || gRaw.includes("MUJER")) genero = "F";
      }

      // GUARDAR O ACTUALIZAR (UPSERT)
      try {
        await prisma.trabajadores.upsert({
          where: { dni },
          update: { nombres, apellidos, area, cargo, genero },
          create: {
            dni,
            nombres,
            apellidos,
            area,
            cargo,
            genero,
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

// 🟢 7. ELIMINAR FIRMA (NUEVO)
const eliminarFirma = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trabajadores.update({
      where: { id_trabajador: Number(id) },
      data: { firma_url: null }, // Ponemos null para borrarla
    });
    res.json({ mensaje: "Firma eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar firma" });
  }
};

// 🟢 NUEVA FUNCIÓN: Actualizar datos generales de un trabajador
const actualizarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;

    // Extraemos el id_trabajador del body para NO intentar actualizar la llave primaria
    // 'datos' contendrá: dni, nombres, apellidos, cargo, firma_url, etc.
    const { id_trabajador, ...datos } = req.body;

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
