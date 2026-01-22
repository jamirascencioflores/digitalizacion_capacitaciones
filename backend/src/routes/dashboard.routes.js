// backend/src/routes/dashboard.routes.js
const { Router } = require("express");
const router = Router();

// 1. Importamos el middleware con llaves (CORRECTO)
const { verificarToken } = require("../middlewares/auth.middleware");

// 2. Importamos el controlador
const controller = require("../controllers/dashboard.controller");

// --- DEBUG ---
console.log("--- DEBUG DASHBOARD ---");
console.log(
  "AuthMiddleware es función?:",
  typeof verificarToken === "function" ? "SI" : "NO (ERROR)",
);

// Verificamos que las funciones del controlador existan
// (Asegúrate de que en dashboard.controller.js se llamen getStats, getRecent, etc.)
console.log("getStats:", controller.getStats ? "OK" : "FALTA");
console.log("getRecent:", controller.getRecent ? "OK" : "FALTA");
console.log("-----------------------");

// 3. Definir rutas usando 'verificarToken'
router.get("/stats", verificarToken, controller.getStats);
router.get("/recent", verificarToken, controller.getRecent);
router.get("/distribution", verificarToken, controller.getDistribution);

module.exports = router;
