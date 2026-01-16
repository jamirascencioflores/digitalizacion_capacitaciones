const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configuración usando variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para subir imagen desde Buffer (Memoria RAM)
const uploadImage = (buffer, folderName = "capacitaciones_app") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName, // Carpeta en Cloudinary
        resource_type: "auto", // Detecta si es jpg, png, pdf, etc.
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result); // Retorna el objeto completo (nos interesa .secure_url)
      }
    );
    // Convertimos el buffer a stream y lo enviamos
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadImage };
