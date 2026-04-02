// frontend/types/index.ts

export interface Usuario {
  id?: number;
  id_usuario: number;
  id_empresa?: number; // 🟢 NUEVO: Soporte para Multitenancy
  nombre: string;
  usuario: string;
  rol: string;
  estado: boolean;
  email?: string;
  solicita_reset?: boolean;
  token?: string;
}

export interface Participante {
  id_participante?: number;
  numero: number;
  dni: string;
  apellidos_nombres: string;
  area_cargo: string;
  firma_url?: string | null;
}

export interface Capacitacion {
  id_capacitacion?: number;
  id_empresa?: number; // 🟢 NUEVO: Para saber de quién es (útil en SOPORTE)
  codigo_acta: string;
  tema: string;
  temario?: string;
  actividad: string;
  accion_correctiva: string;
  modalidad: string;
  escuela: string;
  categoria: string;
  fecha: string;
  hora_inicio: string;
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
  participantes?: Participante[];
}
