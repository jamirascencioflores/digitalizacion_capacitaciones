const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

class ExcelService {
    async generateTrainingReport(capacitaciones, empresa) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Sistema SST Formapp";
        workbook.created = new Date();

        const logoPath = path.join(process.cwd(), "templates", "logo.png");
        let logoId = null;
        if (fs.existsSync(logoPath)) {
            logoId = workbook.addImage({
                buffer: fs.readFileSync(logoPath),
                extension: "png",
            });
        }

        capacitaciones.forEach((cap) => {
            let sheetName = (cap.codigo_acta || `CAP-${cap.id_capacitacion}`)
                .replace(/[\\/?*[\]]/g, "_").substring(0, 30);
            const sheet = workbook.addWorksheet(sheetName);

            // Logo
            if (logoId !== null) {
                sheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 80 } });
            }

            const direccionSede = cap.sede_empresa === "Olmos"
                ? empresa?.direccion_olmos || "Sede Olmos"
                : empresa?.direccion_majes || "Sede Majes";

            // Encabezado
            sheet.mergeCells("C1:F1");
            const titleCell = sheet.getCell("C1");
            titleCell.value = empresa?.nombre || "EMPRESA";
            titleCell.font = { name: "Arial", size: 14, bold: true };
            titleCell.alignment = { horizontal: "center", vertical: "middle" };

            sheet.mergeCells("C2:F2");
            const subtitleCell = sheet.getCell("C2");
            subtitleCell.value = `ACTA - ${cap.codigo_acta}`;
            subtitleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0000FF" } };
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
            sheet.getCell("B6").value = new Date(cap.fecha).toLocaleDateString();
            sheet.getCell("C6").value = "HORARIO:";
            sheet.getCell("D6").value = `${cap.hora_inicio ? cap.hora_inicio.toISOString().substring(11, 16) : ""} - ${cap.hora_termino ? cap.hora_termino.toISOString().substring(11, 16) : ""}`;

            // Tabla Participantes
            const headerRow = sheet.addRow(["N°", "DNI", "APELLIDOS Y NOMBRES", "ÁREA", "CARGO", "FIRMA"]);
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2980B9" } };
                cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
                cell.alignment = { horizontal: "center" };
            });

            if (cap.participantes?.length > 0) {
                cap.participantes.forEach((p, index) => {
                    sheet.addRow([index + 1, p.dni, p.apellidos_nombres, p.area, p.cargo, ""]);
                });
            }

            // Estilo de columnas
            sheet.columns.forEach((column, i) => {
                column.width = i === 2 ? 40 : 15;
            });
        });

        return workbook;
    }
}

module.exports = new ExcelService();
