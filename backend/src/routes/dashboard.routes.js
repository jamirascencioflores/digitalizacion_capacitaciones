// backend/src/routes/dashboard.routes.js
const { Router } = require("express");
const router = Router();

// 1. Importamos el middleware
const { verificarToken } = require("../middlewares/auth.middleware");

// 2. Importamos y desestructuramos el controlador
// Esto evita el error "is not defined" al usar las funciones directamente
const {
  getStats,
  getRecent,
  getDistribution,
  getEmpresasSaaS,
  getEmpresaById,
  getUsuariosByEmpresa,
  toggleEstadoEmpresa,
} = require("../controllers/dashboard.controller");

// --- DEBUG (Opcional, puedes borrarlo después de probar) ---
console.log("--- DEBUG DASHBOARD ROUTES ---");
console.log(
  "VerificarToken disponible:",
  typeof verificarToken === "function" ? "✅" : "❌ ERROR",
);
console.log(
  "getEmpresasSaaS disponible:",
  typeof getEmpresasSaaS === "function" ? "✅" : "❌ ERROR",
);
console.log("------------------------------");

// 3. Definir rutas
// Rutas generales de métricas (Filtradas por empresa en el controlador)
router.get("/stats", verificarToken, getStats);
router.get("/recent", verificarToken, getRecent);
router.get("/distribution", verificarToken, getDistribution);

// Rutas administrativas SaaS (Exclusivas para rol SOPORTE)
router.get("/saas/empresas", verificarToken, getEmpresasSaaS);
router.get("/saas/empresas/:id", verificarToken, getEmpresaById);
router.get("/saas/empresas/:id/usuarios", verificarToken, getUsuariosByEmpresa);
router.patch("/saas/empresas/:id/toggle", verificarToken, toggleEstadoEmpresa);

module.exports = router;
