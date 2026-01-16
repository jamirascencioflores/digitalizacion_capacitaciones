// frontend/services/trabajadores.ts
import api from "./api";

// 🟢 1. DEFINIMOS EL "MOLDE" DE LOS DATOS (Para eliminar el 'any')
export interface TrabajadorData {
  dni: string;
  nombres: string;
  apellidos: string;
  area: string;
  cargo: string;
  genero?: string;
  categoria?: string;
  estado?: boolean;
  // Permitimos acceso dinámico para el bucle forEach
  [key: string]: string | number | boolean | undefined | null;
}

// 2. LISTAR TRABAJADORES
export const getTrabajadores = async () => {
  const response = await api.get("/trabajadores/listado");
  return response.data;
};

// 3. OBTENER UNO POR DNI
export const getTrabajadorByDni = async (dni: string) => {
  const response = await api.get(`/trabajadores/${dni}`);
  return response.data;
};

// 4. CREAR TRABAJADOR (Con Foto Individual) 🟢
// Reemplazamos 'any' por 'TrabajadorData'
export const crearTrabajador = async (
  data: TrabajadorData,
  archivoFirma?: File
) => {
  const formData = new FormData();

  // Agregamos los textos
  Object.keys(data).forEach((key) => {
    const valor = data[key];
    if (valor !== null && valor !== undefined) {
      formData.append(key, String(valor));
    }
  });

  // 🟢 Agregamos la firma (si existe) con el nombre "firma"
  if (archivoFirma) {
    formData.append("firma", archivoFirma);
  }

  const response = await api.post("/trabajadores", formData);
  return response.data;
};

// 5. ACTUALIZAR TRABAJADOR (Con Foto Individual) 🟢
// Reemplazamos 'any' por 'Partial<TrabajadorData>' (Partial hace que los campos sean opcionales al editar)
export const actualizarTrabajador = async (
  id: number,
  data: Partial<TrabajadorData>,
  archivoFirma?: File
) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const valor = data[key];
    if (valor !== null && valor !== undefined) {
      formData.append(key, String(valor));
    }
  });

  // 🟢 Agregamos la firma (si existe) para actualizarla
  if (archivoFirma) {
    formData.append("firma", archivoFirma);
  }

  const response = await api.put(`/trabajadores/${id}`, formData);
  return response.data;
};

// 6. IMPORTAR EXCEL (Datos) 🟢
export const subirExcelTrabajadores = async (file: File) => {
  const formData = new FormData();
  // Clave "excel" para coincidir con upload.single("excel") del backend
  formData.append("excel", file);

  const response = await api.post("/trabajadores/importar-excel", formData);
  return response.data;
};

// 7. CARGA MASIVA DE FIRMAS (Imágenes) 🟢
export const subirFirmasMasivas = async (files: FileList | File[]) => {
  const formData = new FormData();

  // Recorremos los archivos y los añadimos como "firmas" (Plural)
  Array.from(files).forEach((file) => {
    formData.append("firmas", file);
  });

  const response = await api.post("/trabajadores/upload-masivo", formData);
  return response.data;
};

// 8. ELIMINAR TRABAJADOR
export const eliminarTrabajador = async (id: number) => {
  const response = await api.delete(`/trabajadores/${id}`);
  return response.data;
};

// 9. ELIMINAR SOLO FIRMA
export const eliminarFirma = async (id: number) => {
  const response = await api.put(`/trabajadores/${id}/eliminar-firma`);
  return response.data;
};
