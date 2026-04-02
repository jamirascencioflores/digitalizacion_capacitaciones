//backend/src/utils/uploadToFirebase.js
const { storage } = require("../config/firebase");
const sharp = require("sharp"); // 🟢 Importamos sharp

/**
 * Subir desde BUFFER (Convierte TODO a WebP optimizado)
 */
const uploadFromBuffer = (
  buffer,
  folder = "sistema_capacitaciones/otros",
  originalName = "archivo.webp",
) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 🟢 1. MAGIA DE SHARP: Comprime y convierte a WebP (Calidad 80%)
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

      // 2. Aseguramos que el nombre tenga extensión .webp
      const nombreBase = originalName.split(".")[0] || "img";
      const fileName = `${Date.now()}_${nombreBase}.webp`;
      const filePath = `${folder}/${fileName}`;
      const fileRef = storage.file(filePath);

      // 3. Subimos el buffer ya optimizado
      await fileRef.save(webpBuffer, {
        metadata: { contentType: "image/webp" },
      });

      const [url] = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2100",
      });

      resolve({ secure_url: url, public_id: filePath });
    } catch (error) {
      console.error("Error en uploadFromBuffer:", error);
      reject(error);
    }
  });
};

/**
 * Subir desde BASE64 (Firma dibujada)
 */
const uploadFromBase64 = async (base64, folder = "firmas_trabajadores") => {
  try {
    // 1. Extraemos solo los datos crudos del base64
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const bufferOriginal = Buffer.from(base64Data, "base64");

    // 🟢 2. MAGIA DE SHARP: Repasamos la firma para optimizarla al máximo
    const webpBuffer = await sharp(bufferOriginal)
      .webp({ quality: 80, alphaQuality: 100 }) // alphaQuality mantiene el fondo transparente perfecto
      .toBuffer();

    const fileName = `${Date.now()}_firma.webp`;
    const filePath = `${folder}/${fileName}`;
    const fileRef = storage.file(filePath);

    await fileRef.save(webpBuffer, {
      metadata: { contentType: "image/webp" },
    });

    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "01-01-2100",
    });

    return { secure_url: url, public_id: filePath };
  } catch (error) {
    console.error("Error en uploadFromBase64:", error);
    throw error;
  }
};

module.exports = { uploadFromBuffer, uploadFromBase64 };
