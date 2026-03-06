const logger = require('../utils/logger');

/**
 * Middleware para validar datos de entrada usando esquemas de Zod.
 * @param {import('zod').ZodSchema} schema 
 */
const validate = (schema) => (req, res, next) => {
    try {
        // Validamos el cuerpo de la petición (body)
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        // Si hay errores de validación, registramos el evento y enviamos una respuesta detallada
        logger.warn(`Validación fallida para la ruta ${req.originalUrl}: ${JSON.stringify(error.errors)}`);

        return res.status(400).json({
            error: 'Error de validación de datos',
            detalles: error.errors.map(err => ({
                campo: err.path.slice(1).join('.'), // Quitamos 'body' o 'query' de la ruta del campo
                mensaje: err.message
            }))
        });
    }
};

module.exports = validate;
