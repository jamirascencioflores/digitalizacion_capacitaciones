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
export const uploadBase64 = async (
  base64Data: string,
  filename: string
): Promise<string> => {
  // Convertir el string base64 a un objeto File real
  const arr = base64Data.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  const file = new File([u8arr], filename, { type: mime });

  // Reutilizamos la función de arriba para subirlo
  return await uploadImageToLocal(file);
};
