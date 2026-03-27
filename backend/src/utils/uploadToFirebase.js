const { storage } = require("../config/firebase");

/**
 * Subir desde BUFFER (multer memoryStorage)
 */
const uploadFromBuffer = (
  buffer,
  folder = "sistema_capacitaciones/otros",
  originalName = "archivo.webp",
  mimeType = "image/webp",
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `${Date.now()}_${originalName}`;
      const filePath = `${folder}/${fileName}`;
      const fileRef = storage.file(filePath);

      // 🟢 Ahora usa el mimeType real
      await fileRef.save(buffer, {
        metadata: { contentType: mimeType },
      });

      const [url] = await fileRef.getSignedUrl({
        action: "read",
        expires: "01-01-2100",
      });

      resolve({ secure_url: url, public_id: filePath });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Subir desde BASE64 (firma dibujada)
 */
const uploadFromBase64 = async (base64, folder = "firmas_trabajadores") => {
  try {
    // 🟢 Detectar automáticamente si es webp o png desde el base64
    const mimeTypeMatch = base64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/webp";

    // Asignar extensión según el mimetype
    const extension = mimeType.split("/")[1] || "webp";

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `${Date.now()}_firma.${extension}`;
    const filePath = `${folder}/${fileName}`;
    const fileRef = storage.file(filePath);

    await fileRef.save(buffer, {
      metadata: { contentType: mimeType },
    });

    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "01-01-2100",
    });

    return { secure_url: url, public_id: filePath };
  } catch (error) {
    throw error;
  }
};

module.exports = { uploadFromBuffer, uploadFromBase64 };
