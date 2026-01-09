import api from "./api";

export const getEmpresaConfig = async () => {
  try {
    const { data } = await api.get("/empresa"); // Ruta que creamos antes
    return data;
  } catch (error) {
    console.error("Error cargando config empresa", error);
    return null;
  }
};
