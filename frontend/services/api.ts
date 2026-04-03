// frontend/services/api.ts
import axios from "axios";

/**
 * 🟢 CONFIGURACIÓN DINÁMICA DE URL
 * * Prioridad 1: Variable de entorno NEXT_PUBLIC_API_URL (Para Vercel o para Móvil en local)
 * Prioridad 2: Localhost por defecto (Para tu PC)
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    //"ngrok-skip-browser-warning": "true", // 👈 ESTO ES OBLIGATORIO
  },
});

// 🟢 INTERCEPTOR: Inyectar el token automáticamente
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 🔴 INTERCEPTOR DE RESPUESTA (Manejo de sesión expirada)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        console.warn("Sesión expirada o inválida. Cerrando sesión...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Opcional: Redirigir al login
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
