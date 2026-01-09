// frontend/services/dashboard.service.ts
import api from "./api";

export const getDashboardStats = async () => {
  try {
    // Llama al backend para pedir los números
    const { data } = await api.get("/dashboard/stats");
    return data;
  } catch (error) {
    console.error("Error cargando stats", error);
    return null;
  }
};