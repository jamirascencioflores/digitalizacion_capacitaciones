// frontend/types/index.ts

export interface Usuario {
  id?: number; // Aliado para id_usuario si se usa indistintamente
  id_usuario: number;
  nombre: string;
  usuario: string;
  rol: string;
  estado: boolean;
  email?: string;
  solicita_reset?: boolean;
  token?: string;
}

export interface Participante {
  id_participante?: number; // Opcional porque al crear no tiene ID aún
  numero: number;
  dni: string;
  apellidos_nombres: string;
  area_cargo: string;
  firma_url?: string | null;
}

export interface Capacitacion {
  id_capacitacion?: number;
  codigo_acta: string;
  tema: string;
  temario?: string;
  actividad: string;
  accion_correctiva: string;
  modalidad: string;
  escuela: string;
  categoria: string;
  fecha: string; // Viene como string del input date
  hora_inicio: string; // Viene como string del input time
  hora_fin: string;
  tiempo_estimado: string;
  sede: string;
  departamento: string;
  area: string;
  seccion: string;
  zona: string;
  grupo_objetivo: string;
  cultivo: string;
  unidad: string;
  expositor_nombre: string;
  expositor_dni: string;
  insitucion_procedencia: string;
  participantes?: Participante[]; // Array de participantes
}
