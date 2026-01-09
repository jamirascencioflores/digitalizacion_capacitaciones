// frontend/services/auth.service.ts
import api from "./api";
import Cookies from "js-cookie";
import { AxiosError } from "axios"; // Importamos el tipo de error de Axios

export const login = async (usuario: string, contrasena: string) => {
  try {
    const { data } = await api.post("/auth/login", { usuario, contrasena });

    if (data.token) {
      Cookies.set("token", data.token, { expires: 1 });

      // AHORA SÍ: data.usuario es un objeto completo { id, rol, nombre... }
      Cookies.set("usuario", JSON.stringify(data.usuario));
    }
    return data;
  } catch (error: unknown) {
    // Manejo seguro de errores en TypeScript
    if (error instanceof AxiosError) {
      // Si el error viene del backend (Axios)
      throw error.response?.data?.error || "Error al conectar con el servidor";
    }
    // Si es otro tipo de error
    throw "Ocurrió un error inesperado";
  }
};

export const logout = () => {
  Cookies.remove("token");
  Cookies.remove("usuario");
  window.location.href = "/login";
};
