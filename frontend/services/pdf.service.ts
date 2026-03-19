//backend/services/pdf.service.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "./api";

// --- INTERFACES ---
interface EmpresaConfig {
  nombre: string;
  ruc: string;
  logo_url?: string;
  codigo_formato?: string;
  revision_actual?: string;
  direccion_majes?: string;
  direccion_olmos?: string;
  actividad_economica?: string;
}

interface DocumentoPDF {
  url: string;
  tipo: string;
}

interface ParticipantePDF {
  dni: string;
  apellidos_nombres: string;
  area: string;
  cargo: string;
  firma_url?: string | null;
}

interface CapacitacionPDF {
  codigo_acta: string;
  tema_principal: string;
  temario: string;
  objetivo: string;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  total_horas: string;
  actividad: string;
  accion_correctiva: string;
  modalidad: string;
  categoria: string;
  centros: string;
  expositor_nombre: string;
  expositor_dni: string;
  institucion_procedencia: string;
  expositor_firma?: string;
  sede_empresa: string;
  revision_usada?: string;
  total_hombres?: number;
  total_mujeres?: number;
  total_trabajadores?: number;
  participantes: ParticipantePDF[];
  documentos?: DocumentoPDF[];
}

// --- UTILIDAD: CONVERTIR URL A BASE64 ---
const getBase64FromUrl = async (url: string): Promise<string | null> => {
  // 1. Validaciones iniciales para evitar datos basura
  if (
    !url ||
    typeof url !== "string" ||
    url.includes("[object Object]") ||
    url === "null"
  ) {
    return null;
  }

  // 2. Construcción de la URL completa
  const fullUrl = url.startsWith("http")
    ? url
    : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000"}${url.startsWith("/") ? url : "/" + url}`;

  try {
    // 3. Petición con configuración de seguridad para Cloudinary
    const res = await fetch(fullUrl, {
      method: "GET",
      mode: "cors", // Importante para recursos externos como Cloudinary
      credentials: "omit", // Evita enviar cookies que puedan causar conflictos de CORS
      headers: {
        Accept: "image/*",
      },
    });

    if (!res.ok) {
      console.warn(
        `No se pudo cargar la imagen: ${res.status} ${res.statusText}`,
      );
      return null;
    }

    const blob = await res.blob();

    // 4. Conversión a Base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = () => {
        console.error("Error al leer el blob de la imagen");
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error crítico cargando imagen para PDF:", fullUrl, error);
    return null;
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "-";
  if (timeStr.includes("T")) {
    try {
      return new Date(timeStr).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr.substring(0, 5);
    }
  }
  if (timeStr.length >= 5) return timeStr.substring(0, 5);
  return timeStr;
};

// --- PÁGINA 1: PORTADA ---
const generarPortada = (
  doc: jsPDF,
  data: CapacitacionPDF,
  empresa: EmpresaConfig,
  logoBase64: string | null, // 🟢 Recibe el logo aquí
) => {
  const pageWidth = doc.internal.pageSize.width;
  const marginX = 25;
  let currentY = 20;

  // 🟢 LOGICA DEL LOGO PÁGINA 1
  if (logoBase64) {
    // Dibujar Logo (ajusta ancho/alto según tu imagen)
    doc.addImage(logoBase64, "PNG", pageWidth - marginX - 40, currentY, 40, 20);
  } else {
    // Placeholder si no carga
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - marginX - 40, currentY, 40, 25, "F");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("LOGO", pageWidth - marginX - 20, currentY + 12, {
      align: "center",
    });
  }

  currentY += 40;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME DE CAPACITACIÓN", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 25;

  doc.setFontSize(12);
  const labelX = marginX;
  const valueX = marginX + 35;
  const lineHeight = 10;

  const drawHeaderField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", valueX, currentY);
    currentY += lineHeight;
  };

  drawHeaderField("Para :", empresa.nombre);
  drawHeaderField("De :", data.expositor_nombre || "Instructor");
  drawHeaderField("Tema :", data.tema_principal);
  drawHeaderField(
    "Fecha :",
    data.fecha ? new Date(data.fecha).toLocaleDateString() : "-",
  );

  currentY += 5;
  doc.setLineWidth(0.5);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 15;

  doc.setFont("helvetica", "normal");
  const fechaFormatted = data.fecha
    ? new Date(data.fecha).toLocaleDateString()
    : "...";
  doc.text(
    `Por el presente adjunto evidencia de capacitación realizada el día ${fechaFormatted}.`,
    marginX,
    currentY,
  );
  currentY += 15;

  const horarioStr = `${formatTime(data.hora_inicio)} - ${formatTime(
    data.hora_termino,
  )}`;
  drawHeaderField("Horario:", horarioStr);
  drawHeaderField("Duración:", `${data.total_horas} horas`);
  drawHeaderField("Sede:", data.sede_empresa);
  drawHeaderField("Lugar:", data.centros);
  currentY += 5;

  const contentWidth = pageWidth - marginX * 2;
  doc.setFont("helvetica", "bold");
  doc.text("Objetivo:", marginX, currentY);
  currentY += 7;
  doc.setFont("helvetica", "normal");
  const objLines = doc.splitTextToSize(
    data.objetivo || "Sin objetivo.",
    contentWidth,
  );
  doc.text(objLines, marginX, currentY);
  currentY += objLines.length * 7 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Temario / Puntos Tratados:", marginX, currentY);
  currentY += 7;
  doc.setFont("helvetica", "normal");
  const temarioLines = doc.splitTextToSize(
    data.temario || "Sin temario.",
    contentWidth,
  );
  doc.text(temarioLines, marginX, currentY);
  currentY += temarioLines.length * 7 + 15;

  doc.setFont("helvetica", "bold");
  const h = data.total_hombres || 0;
  const m = data.total_mujeres || 0;
  const t = data.total_trabajadores || h + m;
  doc.text(
    `Total Asistentes:  ${t}   (Hombres: ${h} / Mujeres: ${m})`,
    marginX,
    currentY,
  );

  doc.addPage();
};

// --- FUNCIÓN PRINCIPAL ---
export const generarPDFUniversal = async (
  data: CapacitacionPDF,
  empresa: EmpresaConfig,
) => {
  const doc = new jsPDF();

  // --- 1. CARGAR LOGO PRINCIPAL ---
  // Usamos window.location.origin para asegurar que busque en el Frontend (puerto 3000)
  // Asegúrate de que logo.png esté en la carpeta /public
  let logoBase64: string | null = null;
  try {
    const logoUrl = `${window.location.origin}/logo.png`;
    logoBase64 = await getBase64FromUrl(logoUrl);
  } catch (e) {
    console.error("No se pudo cargar el logo", e);
  }

  // --- 2. OBTENER TOTAL DE TRABAJADORES (MAESTRO) ---
  let totalPoblacion = 0;
  try {
    const res = await api.get("/trabajadores");
    const datos = res.data;

    if (Array.isArray(datos)) {
      totalPoblacion = datos.length;
    } else if (datos && datos.data && Array.isArray(datos.data)) {
      totalPoblacion = datos.total || datos.data.length;
    } else if (datos && datos.total) {
      totalPoblacion = datos.total;
    }
  } catch (error) {
    console.error("Error obteniendo total trabajadores:", error);
  }

  // --- 3. CARGA PREVIA DE IMÁGENES (FIRMAS) ---
  const participantesConFirma = await Promise.all(
    data.participantes.map(async (p) => {
      let firmaBase64 = null;
      if (p.firma_url) {
        firmaBase64 = await getBase64FromUrl(p.firma_url);
      }
      return { ...p, firmaBase64 };
    }),
  );

  let expositorFirmaBase64 = null;
  if (data.expositor_firma) {
    expositorFirmaBase64 = await getBase64FromUrl(data.expositor_firma);
  }

  // 4. GENERAR PORTADA (Pasa el logoBase64)
  generarPortada(doc, data, empresa, logoBase64);

  // 5. PÁGINA 2 (ACTA)
  const marginLeft = 10;
  const marginTop = 10;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - marginLeft * 2;
  let currentY = marginTop;

  // --- A. CABECERA PAGINA 2 ---
  const colLeftWidth = 60;
  doc.setDrawColor(0);
  doc.setTextColor(0);

  // 🟢 LOGO EN PAGINA 2
  if (logoBase64) {
    // Ajusta dimensiones (x, y, ancho, alto)
    doc.addImage(logoBase64, "PNG", marginLeft, currentY, 25, 12);
  } else {
    doc.rect(marginLeft, currentY, 20, 15);
    doc.setFontSize(6);
    doc.text("LOGO", marginLeft + 5, currentY + 8);
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nombre, marginLeft, currentY + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const direccionMostrar =
    data.sede_empresa === "Olmos"
      ? `Olmos: ${empresa.direccion_olmos || "-"}`
      : `Majes: ${empresa.direccion_majes || "-"}`;
  const dirLines = doc.splitTextToSize(direccionMostrar, colLeftWidth);
  doc.text(dirLines, marginLeft, currentY + 24);
  const alturaDir = dirLines.length * 3;

  doc.setFont("helvetica", "bold");
  doc.text(`RUC: ${empresa.ruc}`, marginLeft, currentY + 26 + alturaDir);

  const colCenterX = marginLeft + colLeftWidth + 5;
  const colCenterWidth = contentWidth - colLeftWidth - 55;

  doc.setLineWidth(0.5);
  doc.rect(colCenterX, currentY, colCenterWidth, 15);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    "ACTA DE CAPACITACIÓN",
    colCenterX + colCenterWidth / 2,
    currentY + 10,
    { align: "center" },
  );

  const colRightX = colCenterX + colCenterWidth + 5;
  let rightY = currentY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(empresa.codigo_formato || "FPGC 4.8 RH", colRightX, rightY + 3);
  doc.text(`Revisión ${data.revision_usada || "06"}`, colRightX, rightY + 7);

  rightY += 15;
  doc.setFontSize(7);
  doc.text("CODIGO DE ACTA", colRightX, rightY);
  doc.setFontSize(9);
  doc.text(data.codigo_acta, colRightX + 25, rightY);
  doc.line(colRightX + 25, rightY + 1, pageWidth - marginLeft, rightY + 1);

  rightY += 8;
  doc.setFontSize(7);
  const h = data.total_hombres || 0;
  const m = data.total_mujeres || 0;
  doc.text("N° de participantes", colRightX, rightY);
  doc.setFontSize(8);
  doc.text(`H: ${h}    M: ${m}`, colRightX + 28, rightY);
  doc.line(colRightX + 28, rightY + 1, pageWidth - marginLeft, rightY + 1);

  rightY += 6;
  doc.setFontSize(7);
  doc.text("N° de trabajadores en", colRightX, rightY);
  doc.text("el centro laboral", colRightX, rightY + 3);

  // CUADRO DE POBLACIÓN TOTAL
  doc.rect(colRightX + 28, rightY - 2, 18, 8);

  if (totalPoblacion > 0) {
    doc.setFontSize(9);
    doc.text(String(totalPoblacion), colRightX + 37, rightY + 3, {
      align: "center",
    });
  }

  rightY += 12;
  doc.setFontSize(7);
  doc.text("Actividad económica", colRightX, rightY);
  doc.text(
    `${empresa.actividad_economica || "Principal - 0150"}`,
    colRightX + 28,
    rightY,
  );

  currentY = Math.max(currentY + 26 + alturaDir, rightY + 5);
  currentY += 5;

  const drawGraySection = (label: string, textContent: string) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, currentY, 35, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label, marginLeft + 2, currentY + 4);

    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(textContent || "-", contentWidth - 40);
    const height = Math.max(lines.length * 4 + 4, 6);
    doc.text(lines, marginLeft + 38, currentY + 4);
    doc.line(
      marginLeft,
      currentY + height,
      pageWidth - marginLeft,
      currentY + height,
    );
    currentY += height + 2;
  };

  drawGraySection("TEMA PRINCIPAL:", data.tema_principal);
  drawGraySection("TEMARIO:", data.temario);
  drawGraySection("OBJETIVO:", data.objetivo);

  currentY += 3;

  // --- C. GRID DE CLASIFICACIÓN ---
  const rowHeight = 7;
  const drawCheckRow = (
    y: number,
    items: { label: string; checked: boolean }[],
    startX: number,
    spacing: number = 4,
  ) => {
    let x = startX;
    doc.setFontSize(8);
    items.forEach((item) => {
      doc.rect(x, y + 1.5, 3, 3);
      if (item.checked) {
        doc.setFont("helvetica", "bold");
        doc.text("X", x + 0.5, y + 4);
      }
      doc.setFont("helvetica", "normal");
      doc.text(item.label, x + 4, y + 4);
      x += 4 + doc.getTextWidth(item.label) + spacing;
    });
  };

  doc.rect(marginLeft, currentY, contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.text("ACTIVIDAD:", marginLeft + 2, currentY + 4.5);
  const acts = [
    "Inducción",
    "Capacitación",
    "Taller",
    "Charla",
    "Simulacro",
    "Otros",
  ];
  drawCheckRow(
    currentY,
    acts.map((a) => ({ label: a, checked: data.actividad === a })),
    marginLeft + 25,
    3,
  );

  const acX = marginLeft + 134;
  doc.setFont("helvetica", "bold");
  doc.text("ACCIÓN CORRECTIVA:", acX, currentY + 4.5);
  drawCheckRow(
    currentY,
    [
      { label: "SI", checked: data.accion_correctiva === "SI" },
      { label: "NO", checked: data.accion_correctiva === "NO" },
    ],
    acX + 35,
  );
  currentY += rowHeight;

  doc.rect(marginLeft, currentY, contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.text("MODALIDAD:", marginLeft + 2, currentY + 4.5);
  drawCheckRow(
    currentY,
    [
      { label: "Interna", checked: data.modalidad === "Interna" },
      { label: "Externa", checked: data.modalidad === "Externa" },
    ],
    marginLeft + 25,
  );
  currentY += rowHeight;

  doc.rect(marginLeft, currentY, contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.text("CATEGORÍA:", marginLeft + 2, currentY + 4.5);
  const cats = [
    "Seguridad",
    "Inocuidad",
    "Cadena",
    "Med. Ambiente",
    "Resp. Social",
    "Gobernanza",
    "Otros",
  ];
  drawCheckRow(
    currentY,
    cats.map((c) => ({
      label: c,
      // Evaluamos si coincide (Aceptando las versiones largas o cortas)
      checked:
        data.categoria === c ||
        (c === "Med. Ambiente" && data.categoria === "Medio Ambiente") ||
        (c === "Resp. Social" && data.categoria === "Responsabilidad Social"),
    })),
    marginLeft + 22,
    6, // 🟢 Reduje un poquito el espaciado de 6 a 3 para que todos entren perfectos en el ancho de la hoja
  );
  currentY += rowHeight;

  doc.rect(marginLeft, currentY, contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  const fechaStr = data.fecha ? new Date(data.fecha).toLocaleDateString() : "-";
  doc.text(`FECHA: ${fechaStr}`, marginLeft + 2, currentY + 4.5);
  doc.text(
    `INICIO: ${formatTime(data.hora_inicio)}`,
    marginLeft + 50,
    currentY + 4.5,
  );
  doc.text(
    `TÉRMINO: ${formatTime(data.hora_termino)}`,
    marginLeft + 90,
    currentY + 4.5,
  );
  doc.text(
    `TOTAL HORAS: ${data.total_horas}`,
    marginLeft + 140,
    currentY + 4.5,
  );
  currentY += rowHeight;

  doc.rect(marginLeft, currentY, contentWidth, rowHeight);
  doc.setFont("helvetica", "bold");
  doc.text("CENTROS:", marginLeft + 2, currentY + 4.5);
  const centrosList = [
    "Planta Packing",
    "Fundo",
    "Campo",
    "Auditorio",
    "Otros",
  ];
  drawCheckRow(
    currentY,
    centrosList.map((c) => ({ label: c, checked: data.centros === c })),
    marginLeft + 25,
  );
  currentY += rowHeight + 5;

  // --- D. TABLA DE ASISTENCIA ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LISTA DE ASISTENCIA", marginLeft, currentY);
  currentY += 2;

  const tableHeaders = [
    ["N°", "DNI", "APELLIDOS Y NOMBRES", "ÁREA", "CARGO", "FIRMA"],
  ];
  const tableData = participantesConFirma.map((p, index) => [
    index + 1,
    p.dni,
    p.apellidos_nombres,
    p.area,
    p.cargo,
    "",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 7,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 6,
      textColor: 50,
      valign: "middle",
      minCellHeight: 20, // Altura ajustada
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      5: { cellWidth: 35, halign: "center" },
    },
    margin: { left: marginLeft, right: marginLeft },

    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const participante = participantesConFirma[data.row.index];
        if (participante && participante.firmaBase64) {
          try {
            const imgProps = doc.getImageProperties(participante.firmaBase64);
            const cellHeight = data.cell.height - 8;
            const cellWidth = data.cell.width - 4;
            const ratio = imgProps.width / imgProps.height;
            let drawWidth = cellHeight * ratio;
            let drawHeight = cellHeight;

            if (drawWidth > cellWidth) {
              drawWidth = cellWidth;
              drawHeight = cellWidth / ratio;
            }

            const x = data.cell.x + (data.cell.width - drawWidth) / 2;
            const y = data.cell.y + (data.cell.height - drawHeight) / 2;

            doc.addImage(
              participante.firmaBase64,
              "PNG",
              x,
              y,
              drawWidth,
              drawHeight,
            );
          } catch {
            // vacío
          }
        }
      }
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;

  // ESPACIADO EXTRA PARA SEPARAR TABLA DE FIRMA
  currentY = finalY + 45;

  // --- E. PIE DE PÁGINA (FIRMA EXPOSITOR) ---
  if (currentY > 270) {
    doc.addPage();
    currentY = 60;
  }

  const firmaWidth = 70;
  const firmaX = pageWidth / 2 - firmaWidth / 2;

  // Firma Expositor
  if (expositorFirmaBase64) {
    try {
      doc.addImage(
        expositorFirmaBase64,
        "PNG",
        firmaX + 10,
        currentY - 20,
        50,
        20,
      );
    } catch (e) {
      console.error(e);
    }
  }

  doc.setDrawColor(0);
  doc.line(firmaX, currentY, firmaX + firmaWidth, currentY);
  doc.setFontSize(8);
  doc.text(
    data.expositor_nombre || "Nombre Expositor",
    pageWidth / 2,
    currentY + 5,
    { align: "center" },
  );
  doc.text(`DNI: ${data.expositor_dni || "-"}`, pageWidth / 2, currentY + 9, {
    align: "center",
  });
  doc.text(
    data.institucion_procedencia || "Institución",
    pageWidth / 2,
    currentY + 13,
    { align: "center" },
  );
  doc.setFont("helvetica", "bold");
  doc.text("FIRMA DEL EXPOSITOR / ENTRENADOR", pageWidth / 2, currentY + 18, {
    align: "center",
  });

  // --- F. ANEXO FOTOGRÁFICO ---
  if (data.documentos && data.documentos.length > 0) {
    doc.addPage();
    const fotosEvidencia = data.documentos.filter(
      (d) => d.tipo === "EVIDENCIA_FOTO",
    );

    if (fotosEvidencia.length > 0) {
      doc.setFontSize(14);
      doc.text("ANEXO FOTOGRÁFICO", pageWidth / 2, 20, { align: "center" });

      let photoY = 40;
      const fotosBase64 = await Promise.all(
        fotosEvidencia.map((f) => getBase64FromUrl(f.url)),
      );

      for (let i = 0; i < fotosBase64.length; i++) {
        const foto = fotosBase64[i];
        if (!foto) continue;

        if (photoY + 100 > 280) {
          doc.addPage();
          photoY = 20;
        }

        try {
          doc.addImage(foto, "JPEG", (pageWidth - 160) / 2, photoY, 160, 90);
          doc.rect((pageWidth - 160) / 2, photoY, 160, 90);
          doc.setFontSize(10);
          doc.text(`Foto ${i + 1}`, pageWidth / 2, photoY + 95, {
            align: "center",
          });
          photoY += 110;
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  doc.save(`Capacitacion_${data.codigo_acta}.pdf`);
};
