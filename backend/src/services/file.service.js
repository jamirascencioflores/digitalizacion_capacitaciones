const { storage } = require("../config/firebase");
const fs = require("fs");
const path = require("path");

/**
 * Servicio encargado de la gestión de archivos (Firebase Storage + Local FS)
 */
class FileService {
    /**
     * Sube múltiples archivos a Firebase Storage
     * @param {Array} files - Arreglo de archivos de Multer
     * @param {string} folder - Carpeta de destino en Firebase
     * @param {string} type - Tipo de documento (EVIDENCIA_FOTO, etc)
     */
    async uploadMultiple(files, folder, type = "EVIDENCIA_FOTO") {
        if (!files || files.length === 0) return [];

        const uploadPromises = files.map(async (file) => {
            try {
                // Generar un nombre único basado en el original
                const fileName = `${Date.now()}_${path.basename(file.originalname)}`;
                const filePath = `${folder}/${fileName}`;
                const fileRef = storage.file(filePath);

                // Subir el archivo
                await fileRef.save(fs.readFileSync(file.path), {
                    metadata: { contentType: file.mimetype }
                });

                // Obtener URL de descarga (Signed URL larga duración para imitar Cloudinary)
                const [url] = await fileRef.getSignedUrl({
                    action: 'read',
                    expires: '01-01-2100' // URL válida por mucho tiempo
                });

                // Limpieza local
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

                return {
                    url: url,
                    tipo: type,
                    nombre_archivo: file.originalname,
                    path_storage: filePath // Guardamos el path para limpiezas futuras
                };
            } catch (error) {
                console.error(`❌ Error subiendo archivo a Firebase ${file.originalname}:`, error);
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        return results.filter(r => r !== null);
    }

    /**
     * Sube un único archivo a Firebase Storage
     */
    async uploadSingle(file, folder) {
        if (!file) return null;
        try {
            const fileName = `${Date.now()}_${path.basename(file.originalname)}`;
            const filePath = `${folder}/${fileName}`;
            const fileRef = storage.file(filePath);

            await fileRef.save(fs.readFileSync(file.path), {
                metadata: { contentType: file.mimetype }
            });

            const [url] = await fileRef.getSignedUrl({
                action: 'read',
                expires: '01-01-2100'
            });

            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return url;
        } catch (error) {
            console.error("❌ Error subiendo archivo único a Firebase:", error);
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

    /**
     * Elimina un archivo de Firebase Storage (nuevo método para completar el servicio)
     */
    async deleteFile(filePath) {
        try {
            if (!filePath) return;
            const fileRef = storage.file(filePath);
            await fileRef.delete();
            return true;
        } catch (error) {
            console.error(`❌ Error al eliminar archivo de Firebase (${filePath}):`, error);
            return false;
        }
    }
}

module.exports = new FileService();

