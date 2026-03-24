const { storage } = require("../config/firebase");
const streamifier = require("streamifier");
const path = require("path");

/**
 * Subir desde BUFFER (multer memoryStorage)
 */
const uploadFromBuffer = (buffer, folder = "sistema_capacitaciones/otros", originalName = "archivo.png") => {
    return new Promise(async (resolve, reject) => {
        try {
            const fileName = `${Date.now()}_${originalName}`;
            const filePath = `${folder}/${fileName}`;
            const fileRef = storage.file(filePath);

            await fileRef.save(buffer, {
                metadata: { contentType: "image/png" } // O detectar por extensión
            });

            const [url] = await fileRef.getSignedUrl({
                action: 'read',
                expires: '01-01-2100'
            });

            resolve({
                secure_url: url,
                public_id: filePath
            });
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
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const fileName = `${Date.now()}_firma.png`;
        const filePath = `${folder}/${fileName}`;
        const fileRef = storage.file(filePath);

        await fileRef.save(buffer, {
            metadata: { contentType: "image/png" }
        });

        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '01-01-2100'
        });

        return {
            secure_url: url,
            public_id: filePath
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    uploadFromBuffer,
    uploadFromBase64,
};
