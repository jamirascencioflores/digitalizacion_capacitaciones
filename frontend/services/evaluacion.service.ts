import api from "./api";

interface OpcionDTO {
  texto: string;
  es_correcta: boolean;
}

interface PreguntaDTO {
  enunciado: string;
  puntos: number;
  opciones: OpcionDTO[];
}

export interface CrearEvaluacionDTO {
  id_capacitacion: number;
  tipo: string;
  titulo: string;
  preguntas: PreguntaDTO[];
}

// Crear
export const createEvaluacion = async (data: CrearEvaluacionDTO) => {
  const response = await api.post("/evaluaciones", data);
  return response.data;
};

// 🟢 ESTA ES LA QUE FALTABA: Actualizar
export const updateEvaluacion = async (
  id: number,
  data: CrearEvaluacionDTO
) => {
  const response = await api.put(`/evaluaciones/${id}`, data);
  return response.data;
};

// Eliminar
export const deleteEvaluacion = async (id: number) => {
  const response = await api.delete(`/evaluaciones/${id}`);
  return response.data;
};

// Obtener Resultados
export const getResultados = async (id_evaluacion: number) => {
  const response = await api.get(`/evaluaciones/${id_evaluacion}/resultados`);
  return response.data;
};

// Link Público
export const getLinkExamen = (id_evaluacion: number) => {
  if (typeof window === "undefined") return "";
  const baseUrl = window.location.origin;
  return `${baseUrl}/evaluacion/${id_evaluacion}`;
};

// Eliminar Intento
export const deleteIntento = async (id_intento: number) => {
  const response = await api.delete(`/evaluaciones/intento/${id_intento}`);
  return response.data;
};

export const toggleEstadoExamen = async (id: number, estado: boolean) => {
  const response = await api.put(`/evaluaciones/${id}/estado`, { estado });
  return response.data;
};
