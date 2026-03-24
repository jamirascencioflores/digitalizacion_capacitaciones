// frontend/services/upload.service.ts
import api from "./api";

// 1. Subir archivo normal (Input File)
export const uploadImageToLocal = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.url;
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    throw error;
  }
};

// 2. Subir Base64 (Signature Pad) - ¡NUEVA!
export const uploadBase64 = async (base64: string, fileName: string) => {
  try {
    // Convertimos el base64 a un Blob explícitamente como image/webp
    const res = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: "image/webp" });

    const formData = new FormData();
    formData.append("file", file);

    // 🟢 Enviamos al endpoint de Firebase en el backend
    const response = await api.post("/upload", formData);
    return response.data.url;
  } catch (error) {
    console.error("Error en upload:", error);
    return null;
  }
};
