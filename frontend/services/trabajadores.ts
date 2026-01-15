// frontend/services/trabajadores.ts
import api from "./api"; // <--- Aquí importas la configuración que me mostraste

export const subirExcelTrabajadores = async (file: File) => {
  // 1. Crear el objeto FormData (necesario para enviar archivos)
  const formData = new FormData();
  formData.append("file", file); // 'file' debe coincidir con lo que espera tu backend

  // 2. Hacer la petición POST usando tu instancia 'api'
  // Nota: Axios detecta automáticamente que es un archivo y pone los headers correctos
  const response = await api.post("/upload-trabajadores", formData);

  return response.data;
};
