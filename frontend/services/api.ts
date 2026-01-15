// frontend/services/api.ts
import axios from "axios";

const api = axios.create({
  // Asegúrate de que el puerto coincida con tu backend (4000)
  baseURL: "http://localhost:4000/api",
  // SOLO SI ESTÁS CON LA TABLET/CELULAR usa tu IP real
  // baseURL: 'http://192.168.1.15:4000/api'
  headers: {
    "Content-Type": "application/json",
  },
});

// 🟢 INTERCEPTOR: Inyectar el token automáticamente
api.interceptors.request.use(
  (config) => {
    // Leemos el token del almacenamiento local
    // (Asegúrate de que esta clave 'token' coincida con la que usas en AuthContext)
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
  }
);

// 🔴 INTERCEPTOR DE RESPUESTA (Opcional pero recomendado)
// Si el backend dice "Token vencido" (401), cerramos sesión automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Evitar loop infinito si ya estamos en login
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        console.warn("Sesión expirada o inválida. Cerrando sesión...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
