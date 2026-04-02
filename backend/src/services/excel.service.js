const ExcelJS = require("exceljs");

class ExcelService {
  async generateTrainingReport(capacitaciones, empresa) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema SST Formapp";
    workbook.created = new Date();

    // 1. DESCARGA DEL LOGO DE LA EMPRESA (Cabecera)
    let logoId = null;
    if (empresa && empresa.logo_url) {
      try {
        const response = await fetch(empresa.logo_url);
        const arrayBuffer = await response.arrayBuffer();
        const extension = empresa.logo_url.toLowerCase().includes(".png")
          ? "png"
          : "jpeg";

        logoId = workbook.addImage({
          buffer: Buffer.from(arrayBuffer),
          extension: extension,
        });
      } catch (error) {
        console.error("Error cargando logo empresa:", error.message);
      }
    }

    // 2. PROCESAR CADA CAPACITACIÓN (Ahora con for...of para permitir await)
    for (const cap of capacitaciones) {
      let sheetName = (cap.codigo_acta || `CAP-${cap.id_capacitacion}`)
        .replace(/[\\/?*[\]]/g, "_")
        .substring(0, 30);
      const sheet = workbook.addWorksheet(sheetName);

      if (logoId !== null) {
        sheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 120, height: 80 },
        });
      }

      const direccionSede = cap.sede_empresa
        ? `Sede de Ejecución: ${cap.sede_empresa}`
        : empresa?.direccion || "Sede Principal";

      // Diseño de Encabezado
      sheet.mergeCells("C1:F1");
      const titleCell = sheet.getCell("C1");
      titleCell.value = empresa?.razon_social || empresa?.nombre || "EMPRESA";
      titleCell.font = { name: "Arial", size: 14, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.mergeCells("C2:F2");
      const subtitleCell = sheet.getCell("C2");
      subtitleCell.value = `ACTA DE CAPACITACIÓN - ${cap.codigo_acta || "SC"}`;
      subtitleCell.font = {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FF0000FF" },
      };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

      sheet.mergeCells("C3:F3");
      const dirCell = sheet.getCell("C3");
      dirCell.value = direccionSede;
      dirCell.font = { size: 9, italic: true };
      dirCell.alignment = { horizontal: "center", vertical: "middle" };

      // Info General
      sheet.getCell("A5").value = "TEMA:";
      sheet.getCell("B5").value = cap.tema_principal;
      sheet.getCell("A6").value = "FECHA:";
      sheet.getCell("B6").value = cap.fecha
        ? new Date(cap.fecha).toLocaleDateString()
        : "";

      const parseHora = (h) =>
        h instanceof Date
          ? h.toISOString().substring(11, 16)
          : String(h || "").substring(0, 5);
      sheet.getCell("C6").value = "HORARIO:";
      sheet.getCell("D6").value =
        `${parseHora(cap.hora_inicio)} - ${parseHora(cap.hora_termino)}`;

      // Tabla Participantes - Encabezados
      const headerRow = sheet.addRow([
        "N°",
        "DNI",
        "APELLIDOS Y NOMBRES",
        "ÁREA",
        "CARGO",
        "FIRMA",
      ]);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2980B9" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // 3. INSERTAR PARTICIPANTES Y SUS FIRMAS
      if (cap.participantes?.length > 0) {
        for (const [index, p] of cap.participantes.entries()) {
          // Agregamos la fila (la columna 6 queda vacía de texto para poner la imagen encima)
          const row = sheet.addRow([
            index + 1,
            p.dni,
            p.apellidos_nombres,
            p.area,
            p.cargo,
            "",
          ]);
          row.height = 40; // 🟢 Altura suficiente para la firma
          row.alignment = { vertical: "middle" };

          if (p.firma_url) {
            try {
              const fResp = await fetch(p.firma_url);
              const fBuf = await fResp.arrayBuffer();

              // Añadir firma al libro
              const fId = workbook.addImage({
                buffer: Buffer.from(fBuf),
                extension: "png", // Generalmente son PNG
              });

              // 🟢 INSERTAR IMAGEN EN LA COLUMNA 6 (F)
              // row.number es el número de fila actual en Excel
              sheet.addImage(fId, {
                tl: { col: 5.1, row: row.number - 1 + 0.1 }, // col 5 = F, row.number-1 porque es base 0
                ext: { width: 80, height: 35 }, // Ajustar tamaño de la firma
              });
            } catch (e) {
              console.error(`Error firma trabajador ${p.dni}:`, e.message);
            }
          }
        }
      }

      // Estilo de columnas
      sheet.columns.forEach((column, i) => {
        column.width = i === 2 ? 45 : 18; // El nombre más ancho
      });
    }

    return workbook;
  }
}

module.exports = new ExcelService();
