const cloudinary = require("../config/cloudinary");
const fs = require("fs");

/**
 * Servicio encargado de la gestión de archivos (Cloudinary + Local FS)
 */
class FileService {
    /**
     * Sube múltiples archivos a Cloudinary y los elimina del disco local
     * @param {Array} files - Arreglo de archivos de Multer
     * @param {string} folder - Carpeta de destino en Cloudinary
     * @param {string} type - Tipo de documento (EVIDENCIA_FOTO, etc)
     */
    async uploadMultiple(files, folder, type = "EVIDENCIA_FOTO") {
        if (!files || files.length === 0) return [];

        const uploadPromises = files.map(async (file) => {
            try {
                const result = await cloudinary.uploader.upload(file.path, { folder });
                // Limpieza local
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

                return {
                    url: result.secure_url,
                    tipo: type,
                    nombre_archivo: file.originalname,
                };
            } catch (error) {
                console.error(`❌ Error subiendo archivo ${file.originalname}:`, error);
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        return results.filter(r => r !== null);
    }

    /**
     * Sube un único archivo a Cloudinary
     */
    async uploadSingle(file, folder) {
        if (!file) return null;
        try {
            const result = await cloudinary.uploader.upload(file.path, { folder });
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return result.secure_url;
        } catch (error) {
            console.error("❌ Error subiendo archivo único:", error);
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return null;
        }
    }

    /**
     * Limpia archivos locales si una operación falla
     */
    clearLocalFiles(files) {
        if (!files) return;
        const allFiles = Object.values(files).flat();
        allFiles.forEach((f) => {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
    }
}

module.exports = new FileService();
