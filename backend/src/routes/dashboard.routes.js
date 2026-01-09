// backend/src/routes/dashboard.routes.js
const { Router } = require("express");
const router = Router();

// IMPORTANTE: Aquí importamos el middleware directamente
const authMiddleware = require("../middlewares/auth.middleware");

// Importamos el controlador
const controller = require("../controllers/dashboard.controller");

console.log("--- DEBUG DASHBOARD ---");
console.log(
  "AuthMiddleware es función?:",
  typeof authMiddleware === "function" ? "SI" : "NO (ERROR)"
);
console.log("getStats:", controller.getStats ? "OK" : "FALTA");
console.log("getRecent:", controller.getRecent ? "OK" : "FALTA");
console.log("-----------------------");

// Definir rutas
router.get("/stats", authMiddleware, controller.getStats);
router.get("/recent", authMiddleware, controller.getRecent);
router.get("/distribution", authMiddleware, controller.getDistribution);

module.exports = router;
