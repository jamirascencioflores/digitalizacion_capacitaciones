const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");

async function crearPlantilla() {
  // 1. Crear documento vacío
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4
  const { width, height } = page.getSize();

  // 2. Dibujar Marcos y Títulos (Simulando GH-GD-FO-0609)
  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Título
  page.drawText("REGISTRO DE INDUCCIÓN, CAPACITACIÓN Y ENTRENAMIENTO", {
    x: 100,
    y: height - 80,
    size: 12,
    font: font,
  });

  // Líneas de Cabecera (Simuladas)
  page.drawLine({
    start: { x: 40, y: 720 },
    end: { x: width - 40, y: 720 },
    thickness: 1,
  });
  page.drawText("CÓDIGO ACTA:", { x: 50, y: 705, size: 10, font });
  page.drawText("TEMA:", { x: 50, y: 685, size: 10, font });
  page.drawText("SEDE:", { x: 50, y: 665, size: 10, font });
  page.drawText("EXPOSITOR:", { x: 50, y: 645, size: 10, font });

  // 3. Dibujar la Tabla de Participantes (12 Filas)
  let y = 520;
  page.drawText("LISTA DE PARTICIPANTES", { x: 200, y: 530, size: 10, font });

  // Dibujar 12 renglones
  for (let i = 0; i < 13; i++) {
    page.drawLine({
      start: { x: 40, y: y },
      end: { x: width - 40, y: y },
      thickness: 1,
    });
    y -= 25; // Espacio entre renglones
  }

  // Columnas verticales de la tabla
  page.drawLine({ start: { x: 80, y: 520 }, end: { x: 80, y: y + 25 } }); // Línea #
  page.drawLine({ start: { x: 150, y: 520 }, end: { x: 150, y: y + 25 } }); // Línea DNI
  page.drawLine({ start: { x: 380, y: 520 }, end: { x: 380, y: y + 25 } }); // Línea Nombres

  // 4. Guardar el archivo
  const pdfBytes = await pdfDoc.save();

  // Asegurar que la carpeta existe
  if (!fs.existsSync("templates")) {
    fs.mkdirSync("templates");
  }

  fs.writeFileSync("templates/plantilla_acta.pdf", pdfBytes);
  console.log("✅ Plantilla generada en backend/templates/plantilla_acta.pdf");
}

crearPlantilla();
