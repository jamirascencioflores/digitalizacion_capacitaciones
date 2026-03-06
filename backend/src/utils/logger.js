const winston = require('winston');
const path = require('path');

// Definir niveles y colores (opcional)
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Configuración del formato
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// Transportes: dónde se guardan los logs
const transports = [
    // Consola para desarrollo
    new winston.transports.Console(),
    // Archivo para errores solamente
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
    }),
    // Archivo para todos los niveles
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/all.log') }),
];

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    levels,
    format,
    transports,
});

module.exports = logger;
