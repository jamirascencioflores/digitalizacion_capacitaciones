import api from "./api";

// Obtener lista de todas las capacitaciones (para la tabla)
export const getCapacitacionesReporte = async () => {
  try {
    const { data } = await api.get("/dashboard/stats"); // Reusamos el endpoint que trae las recientes, o creamos uno específico si son muchas
    // Nota: Para un sistema real, deberíamos tener un endpoint /capacitaciones con paginación.
    // Por ahora, usaremos la lista de "recientes" que ya trae el dashboard o creamos uno simple.
    return data.recientes;
  } catch (error) {
    console.error("Error al cargar lista", error);
    return [];
  }
};

// Descargar el PDF (Blob)
export const descargarActaPDF = async (id: number, codigo: string) => {
  try {
    const response = await api.get(`/pdf/acta/${id}`, {
      responseType: "blob", // ¡Importante! Decimos que es un archivo binario
    });

    // Crear un link invisible para forzar la descarga en el navegador
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Acta-${codigo}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error al descargar PDF", error);
    alert(
      "No se pudo generar el PDF. Verifica que la plantilla exista en el backend."
    );
  }
};
