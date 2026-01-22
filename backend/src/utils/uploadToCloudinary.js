// backend/src/utils/uploadToCloudinary.js
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// 🟢 Subir desde BUFFER (multer memoryStorage)
// En tu archivo de utilidades/cloudinary
const uploadFromBuffer = (buffer, folder = "sistema_capacitaciones/otros") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto", // 🟢 Aprovecha para optimizar el peso aquí
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// 🟢 Subir desde BASE64 (firma dibujada)
const uploadFromBase64 = (base64, folder = "firmas_trabajadores") => {
  return cloudinary.uploader.upload(base64, {
    folder,
    resource_type: "image",
  });
};

module.exports = {
  uploadFromBuffer,
  uploadFromBase64,
};
