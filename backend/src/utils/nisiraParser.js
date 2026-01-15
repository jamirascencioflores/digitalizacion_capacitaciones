// backend/src/utils/nisiraParser.js

function parsearExcelNisira(contenidoArchivo) {
  // Verificamos que haya contenido
  if (!contenidoArchivo) return [];

  // Separa por líneas (detecta saltos de Windows \r\n o Linux \n)
  const lineas = contenidoArchivo.split(/\r?\n/);
  const registrosLimpios = [];
  let buffer = "";

  // Regex: Busca inicio de registro (números, separador, 8 dígitos DNI)
  const inicioRegistroRegex = /^\d+[\s,;]+\d{8}/;

  // --- FASE 1: Unir líneas rotas ---
  const lineasUnidas = [];
  for (const linea of lineas) {
    const limpia = linea.trim();
    // Ignoramos basura del reporte
    if (
      !limpia ||
      limpia.includes("Fuente: Nisira") ||
      limpia.includes("Elaborado por")
    )
      continue;

    if (inicioRegistroRegex.test(limpia)) {
      if (buffer) lineasUnidas.push(buffer);
      buffer = limpia;
    } else {
      buffer += " " + limpia; // Une la línea rota con la anterior
    }
  }
  if (buffer) lineasUnidas.push(buffer);

  // --- FASE 2: Extraer datos ---
  for (const fila of lineasUnidas) {
    // Detecta si usa ; o ,
    const separador =
      fila.split(";").length > fila.split(",").length ? ";" : ",";
    // Limpia comillas
    const cols = fila.split(separador).map((c) => c.trim().replace(/"/g, ""));

    if (cols.length < 5) continue;

    try {
      // Estrategia: Buscar "M" o "F" para ubicar las columnas dinámicamente
      let genero = "M";
      let indiceArea = -1;

      for (let i = 5; i < cols.length; i++) {
        if (cols[i] === "M" || cols[i] === "F") {
          genero = cols[i];
          indiceArea = i + 1; // El área suele estar justo después del sexo
          break;
        }
      }

      if (indiceArea === -1) continue;

      const area = cols[indiceArea] || "";
      const cargo = cols[indiceArea + 1] || "";

      // Buscar categorías especiales (EDS, CIFHS)
      let categoria = "";
      const claves = ["SCSST", "CIFHS", "EDS", "COMITE"];

      // Buscamos desde el área hacia adelante
      for (let j = indiceArea + 2; j < cols.length; j++) {
        const val = cols[j].toUpperCase();
        if (claves.some((k) => val.includes(k))) {
          categoria = claves.find((k) => val.includes(k)) || "";
          break;
        }
      }

      registrosLimpios.push({
        dni: cols[1], // Asumiendo DNI en columna 1
        apellidos: `${cols[3]} ${cols[4]}`.trim(),
        nombres: cols[5],
        genero,
        area,
        cargo,
        categoria,
      });
    } catch (e) {
      console.error("Error parseando fila:", fila);
    }
  }

  return registrosLimpios;
}

// IMPORTANTE: Exportar con sintaxis de Node.js
module.exports = { parsearExcelNisira };
