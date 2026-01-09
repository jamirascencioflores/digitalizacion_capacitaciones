// backend/src/controllers/pdf.controller.js
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const prisma = require("../utils/db");

const generarPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener datos desde la BD
    const cap = await prisma.capacitaciones.findUnique({
      where: { id_capacitacion: Number(id) },
      include: { participantes: true, usuarios: true },
    });

    if (!cap)
      return res.status(404).json({ error: "Capacitación no encontrada" });

    // 2. Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // =========================================================
    //                     PÁGINA 1 (INFORME)
    // =========================================================
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page1.getSize();

    const MARGEN_IZQ = 70;
    const MARGEN_DER = 70;
    const ANCHO_TEXTO = width - MARGEN_IZQ - MARGEN_DER;

    // --- LOGO ---
    const logoPath = path.join(process.cwd(), "templates", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const dims = logoImg.scale(0.09);
      page1.drawImage(logoImg, {
        x: width - 40 - dims.width,
        y: height - dims.height - 20,
        width: dims.width,
        height: dims.height,
      });
    }

    // --- TÍTULO ---
    const titulo = "INFORME DE CAPACITACIÓN";
    const anchoTitulo = fontBold.widthOfTextAtSize(titulo, 12);
    page1.drawText(titulo, {
      x: (width - anchoTitulo) / 2,
      y: height - 150,
      size: 12,
      font: fontBold,
    });

    // --- CAMPOS ---
    let y = height - 200;
    const drawField = (label, value) => {
      page1.drawText(label, { x: MARGEN_IZQ, y, size: 11, font: fontBold });
      page1.drawText(String(value || ""), {
        x: MARGEN_IZQ + 70,
        y,
        size: 11,
        font: fontRegular,
      });
      y -= 25;
    };

    drawField("Para :", "AGRICOLA PAMPA BAJA S.A.C.");
    drawField("De :", cap.expositor_nombre);
    drawField("Tema :", cap.tema_principal);
    drawField(
      "Fecha :",
      new Date(cap.fecha).toLocaleDateString("es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );

    y -= 15;
    page1.drawLine({
      start: { x: MARGEN_IZQ, y },
      end: { x: width - MARGEN_DER, y },
      thickness: 1.5,
    });
    y -= 40;

    page1.drawText(
      `Por el presente adjunto evidencia de capacitación realizada el día ${new Date(
        cap.fecha
      ).toLocaleDateString("es-PE")}.`,
      { x: MARGEN_IZQ, y, size: 11, font: fontRegular }
    );
    y -= 35;

    // --- DETALLES ---
    const h1 = new Date(cap.hora_inicio).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const h2 = new Date(cap.hora_termino).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const drawDetail = (label, value) => {
      const text = `${label}:`;
      page1.drawText(text, { x: MARGEN_IZQ, y, size: 10, font: fontRegular });
      const w = fontRegular.widthOfTextAtSize(text, 10);
      page1.drawText(String(value || ""), {
        x: MARGEN_IZQ + w + 8,
        y,
        size: 10,
        font: fontRegular,
      });
      y -= 20;
    };

    drawDetail("Horario", `${h1} - ${h2}`);
    drawDetail("Duración", cap.total_horas);
    drawDetail("Sede", cap.sede_empresa);
    drawDetail("Lugar", cap.centros);

    // --- OBJETIVO ---
    if (cap.objetivo) {
      y -= 10;
      page1.drawText("Objetivo:", {
        x: MARGEN_IZQ,
        y,
        size: 10,
        font: fontBold,
      });
      y -= 15;
      page1.drawText(cap.objetivo, {
        x: MARGEN_IZQ,
        y,
        size: 10,
        font: fontRegular,
        maxWidth: ANCHO_TEXTO,
        lineHeight: 14,
      });
      y -= Math.ceil(cap.objetivo.length / 95) * 14 + 10;
    }

    // --- TEMARIO ---
    page1.drawText("Temario / Puntos Tratados:", {
      x: MARGEN_IZQ,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 15;
    page1.drawText(cap.temario || "Ver adjunto", {
      x: MARGEN_IZQ,
      y,
      size: 10,
      font: fontRegular,
      maxWidth: ANCHO_TEXTO,
      lineHeight: 14,
    });
    y -= Math.ceil((cap.temario || "").length / 95) * 14 + 20;

    drawDetail(
      "Total Asistentes",
      `${cap.participantes.length} (Hombres: ${cap.total_hombres} / Mujeres: ${cap.total_mujeres})`
    );

    // =========================================================
    //                     PÁGINA 2 (ACTA OFICIAL)
    // =========================================================
    const templatePath = path.join(
      process.cwd(),
      "templates",
      "plantilla_acta.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const templatePdf = await PDFDocument.load(templateBytes);
    const [formatPage] = await pdfDoc.copyPages(templatePdf, [0]);
    pdfDoc.addPage(formatPage);

    const page2 = pdfDoc.getPages()[1];

    // Funciones Helper para página 2
    const draw = (txt, x, y, size = 7.5) =>
      page2.drawText(String(txt || ""), { x, y, size, font: fontRegular });
    const markX = (x, y) =>
      page2.drawText("X", { x, y, size: 7.5, font: fontBold });
    const fechaPE = new Date(cap.fecha).toLocaleDateString("es-PE");

    // --- LLENADO DE DATOS (Calibración) ---
    draw(cap.codigo_acta, 495, 785);
    draw(cap.total_hombres, 500, 770);
    draw(cap.total_mujeres, 550, 770);
    draw(cap.total_trabajadores, 500, 735);
    draw(cap.tema_principal, 100, 745, 8);

    page2.drawText(cap.temario || "", {
      x: 70,
      y: 715,
      size: 7,
      font: fontRegular,
      maxWidth: 520,
      lineHeight: 9,
    });

    // Checkboxes
    if (cap.actividad === "Inducción") markX(106, 676);
    if (cap.actividad === "Capacitación") markX(180, 676);
    if (cap.actividad === "Taller") markX(220, 676);
    if (cap.actividad === "Charla") markX(265, 676);
    if (cap.actividad === "Simulacro") markX(335, 676);
    if (cap.actividad === "Otros") markX(380, 676);

    if (cap.accion_correctiva === "SI") markX(515, 676);
    if (cap.accion_correctiva === "NO") markX(550, 676);

    if (cap.modalidad === "Interna") markX(158, 659);
    if (cap.modalidad === "Externa") markX(230, 659);

    if (cap.categoria === "Seguridad") markX(190, 635);
    if (cap.categoria === "Inocuidad") markX(308, 640);
    if (cap.categoria === "Cadena") markX(435, 635);
    if (cap.categoria === "Medio Ambiente") markX(110, 615);
    if (cap.categoria === "Responsabilidad Social") markX(260, 615);
    if (cap.categoria === "Otros") markX(395, 615);

    draw(fechaPE, 90, 615);
    draw(h1, 180, 615);
    draw(h2, 310, 615);
    draw(cap.total_horas, 490, 615);

    if (cap.centros === "Planta Packing") markX(128, 595);
    if (cap.centros === "Fundo") markX(210, 595);
    if (cap.centros === "Campo") markX(270, 595);
    if (cap.centros === "Auditorio") markX(395, 595);
    if (cap.centros === "Otros") markX(485, 595);

    page2.drawText(cap.objetivo || "", {
      x: 95,
      y: 580,
      size: 7,
      font: fontRegular,
      maxWidth: 460,
      lineHeight: 10,
    });

    // --- TABLA PARTICIPANTES ---
    let yRow = 525;
    const rowStep = 17;

    for (const [index, p] of cap.participantes.entries()) {
      if (index >= 20) break;
      draw(p.dni || "", 70, yRow);
      draw((p.area || "").substring(0, 25), 140, yRow);
      draw((p.cargo || "").substring(0, 25), 230, yRow);
      draw((p.apellidos_nombres || "").substring(0, 45), 330, yRow);

      // Firma Participante
      if (p.firma) {
        try {
          const urlParts = p.firma.split("/uploads/");
          if (urlParts.length === 2) {
            const filename = urlParts[1];
            const firmaPath = path.join(process.cwd(), "uploads", filename);
            if (fs.existsSync(firmaPath)) {
              const firmaBytes = fs.readFileSync(firmaPath);
              let firmaImg = filename.toLowerCase().endsWith(".png")
                ? await pdfDoc.embedPng(firmaBytes)
                : await pdfDoc.embedJpg(firmaBytes);

              const dims = firmaImg.scaleToFit(65, 14);
              page2.drawImage(firmaImg, {
                x: 470,
                y: yRow - 6,
                width: dims.width,
                height: dims.height,
              });
            }
          }
        } catch (err) {
          console.error("Error firma participante", err);
        }
      }
      yRow -= rowStep;
    }

    // --- DATOS Y FIRMA EXPOSITOR ---
    draw(cap.expositor_nombre || "", 140, 95);
    if (cap.expositor_dni && cap.expositor_dni !== "S/N") {
      draw("DNI: " + cap.expositor_dni, 350, 85);
    }

    if (cap.expositor_firma) {
      try {
        const urlParts = cap.expositor_firma.split("/uploads/");
        if (urlParts.length === 2) {
          const filename = urlParts[1];
          const firmaPath = path.join(process.cwd(), "uploads", filename);
          if (fs.existsSync(firmaPath)) {
            const firmaBytes = fs.readFileSync(firmaPath);
            let firmaImg = filename.toLowerCase().endsWith(".png")
              ? await pdfDoc.embedPng(firmaBytes)
              : await pdfDoc.embedJpg(firmaBytes);

            const dims = firmaImg.scaleToFit(65, 14);
            page2.drawImage(firmaImg, {
              x: 140,
              y: 105,
              width: dims.width,
              height: dims.height,
            });
          }
        }
      } catch (err) {
        console.error("Error firma expositor", err);
      }
    }

    // 3. Guardar y enviar
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Acta-${cap.codigo_acta}.pdf`
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error al generar PDF:", error);
    res
      .status(500)
      .json({ error: "Error al generar PDF", detalle: error.message });
  }
};

module.exports = { generarPDF };
