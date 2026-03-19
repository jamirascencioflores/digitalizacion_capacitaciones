// backend/src/server.js
require("dotenv").config(); // 🟢 ESTA DEBE SER LA LÍNEA 1 OBLIGATORIAMENTE
const express = require("express");
const cors = require("cors");
const path = require("path");

//dotenv.config();

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const capacitacionRoutes = require("./routes/capacitacion.routes");
const trabajadorRoutes = require("./routes/trabajador.routes");
const empresaRoutes = require("./routes/empresa.routes");
const uploadRoutes = require("./routes/upload.routes");
const gestionRoutes = require("./routes/gestion.routes");
const usuarioRoutes = require("./routes/usuario.routes");
const evaluacionRoutes = require("./routes/evaluacion.routes");
const contactoRoutes = require("./routes/contacto.routes");
const notificacionRoutes = require('./routes/notificacion.routes');

const cookieParser = require("cookie-parser");
const logger = require("./utils/logger");

const app = express();

// 1. CONFIGURACIÓN DE CORS
app.use(
  cors({
    origin: true,
    credentials: true, // Permitir envío de cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 2. MIDDLEWARES
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});


// 3. ARCHIVOS ESTÁTICOS
// Esto permite que cuando el PDF pida "localhost:4000/uploads/foto.jpg", la imagen se vea.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 4. RUTAS
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/capacitaciones", capacitacionRoutes);
app.use("/api/trabajadores", trabajadorRoutes);
app.use("/api/empresa", empresaRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/gestion", gestionRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/evaluaciones", evaluacionRoutes);
app.use("/api/contacto", contactoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API SST Funcionando 🚀");
});

// 5. INICIAR SERVIDOR
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "OK" : "NO EXISTE");

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("----------------------");
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log("----------------------");
});
