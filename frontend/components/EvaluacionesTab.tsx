'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// Servicios
import {
    createEvaluacion,
    updateEvaluacion,
    getLinkExamen,
    deleteEvaluacion,
    getResultados,
    deleteIntento,
    toggleEstadoExamen
} from '@/services/evaluacion.service';

// Sub-componentes
import EvaluacionCard from './evaluaciones/EvaluacionCard';
import ResultadosModal from './evaluaciones/ResultadosModal';
import EvaluacionForm from './evaluaciones/EvaluacionForm';

interface EvaluacionExistente {
    id_evaluacion: number;
    titulo: string;
    tipo: string;
    estado: boolean;
    fecha_cierre?: string;
    preguntas?: any[];
}

interface ResultadoAlumno {
    id_intento: number;
    dni_trabajador: string;
    nombre_completo: string;
    nota: number;
    fecha_intento: string;
}

interface Props {
    idCapacitacion: number;
    evaluacionesExistentes: EvaluacionExistente[];
    onRecargar: () => void;
}

export default function EvaluacionesTab({ idCapacitacion, evaluacionesExistentes, onRecargar }: Props) {
    // --- ESTADOS ---
    const [verResultados, setVerResultados] = useState(false);
    const [listaResultados, setListaResultados] = useState<ResultadoAlumno[]>([]);
    const [loadingResultados, setLoadingResultados] = useState(false);

    const [modoFormulario, setModoFormulario] = useState(false);
    const [idEdicion, setIdEdicion] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [dataEdicion, setDataEdicion] = useState<any>(null);

    // --- ACCIONES DE RESULTADOS ---
    const handleExportarExcel = () => {
        if (listaResultados.length === 0) return toast.error("No hay datos para exportar");

        const datosExcel = listaResultados.map(r => ({
            Fecha: new Date(r.fecha_intento).toLocaleDateString(),
            Hora: new Date(r.fecha_intento).toLocaleTimeString(),
            DNI: r.dni_trabajador,
            Trabajador: r.nombre_completo,
            Nota: r.nota,
            Estado: r.nota >= 13 ? 'APROBADO' : 'DESAPROBADO'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datosExcel);
        XLSX.utils.book_append_sheet(wb, ws, "Resultados");
        XLSX.writeFile(wb, `Resultados_Evaluacion.xlsx`);
        toast.success("Excel generado correctamente");
    };

    const handleVerResultados = async (id_evaluacion: number) => {
        setLoadingResultados(true);
        setVerResultados(true);
        try {
            const data = await getResultados(id_evaluacion);
            setListaResultados(data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar resultados");
            setVerResultados(false);
        } finally {
            setLoadingResultados(false);
        }
    };

    const handleEliminarIntento = async (id_intento: number) => {
        toast.warning("¿Borrar el resultado de este alumno?", {
            action: {
                label: "Eliminar",
                onClick: async () => {
                    try {
                        await deleteIntento(id_intento);
                        setListaResultados(prev => prev.filter(r => r.id_intento !== id_intento));
                        toast.success("Intento eliminado");
                    } catch (e) {
                        console.error(e);
                        toast.error("Error al eliminar el intento");
                    }
                }
            }
        });
    };

    // --- ACCIONES DE EVALUACIÓN ---
    const handleToggleEstado = async (eva: EvaluacionExistente) => {
        const nuevoEstado = !eva.estado;
        toast.info(`¿Deseas ${nuevoEstado ? 'ABRIR' : 'CERRAR'} este examen?`, {
            action: {
                label: "Confirmar",
                onClick: async () => {
                    try {
                        await toggleEstadoExamen(eva.id_evaluacion, nuevoEstado);
                        toast.success(`Examen ${nuevoEstado ? 'abierto' : 'cerrado'} correctamente`);
                        onRecargar();
                    } catch (error) {
                        console.error(error);
                        toast.error("Error al cambiar estado");
                    }
                }
            }
        });
    };

    const handleEliminarExamen = async (id: number) => {
        toast.error("Al eliminar se borrarán también las notas. ¿Proceder?", {
            action: {
                label: "Borrar Todo",
                onClick: async () => {
                    try {
                        await deleteEvaluacion(id);
                        toast.success("Examen eliminado");
                        onRecargar();
                    } catch (e) {
                        console.error(e);
                        toast.error("Error al eliminar");
                    }
                }
            }
        });
    };

    const handleEditar = (eva: EvaluacionExistente) => {
        setIdEdicion(eva.id_evaluacion);
        setDataEdicion(eva);
        setModoFormulario(true);
    };

    const handleGuardar = async (payload: any) => {
        setSaving(true);
        try {
            if (idEdicion) {
                await updateEvaluacion(idEdicion, payload);
                toast.success("Examen actualizado");
            } else {
                await createEvaluacion(payload);
                toast.success("Evaluación creada con éxito");
            }
            setModoFormulario(false);
            setIdEdicion(null);
            onRecargar();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    if (modoFormulario) {
        return (
            <EvaluacionForm
                idEdicion={idEdicion}
                idCapacitacion={idCapacitacion}
                initialData={dataEdicion}
                onClose={() => setModoFormulario(false)}
                onSave={handleGuardar}
                saving={saving}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in relative transition-all duration-500">
            {/* MODAL RESULTADOS (Sub-componente) */}
            <ResultadosModal
                verResultados={verResultados}
                setVerResultados={setVerResultados}
                listaResultados={listaResultados}
                loadingResultados={loadingResultados}
                handleExportarExcel={handleExportarExcel}
                handleEliminarIntento={handleEliminarIntento}
            />

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Evaluaciones Digitales</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gestiona los exámenes PRE y POST capacitación</p>
                </div>
                <button
                    onClick={() => { setIdEdicion(null); setDataEdicion(null); setModoFormulario(true); }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-bold text-sm"
                >
                    <Plus size={18} strokeWidth={2.5} /> Crear Examen
                </button>
            </div>

            {/* LISTADO DE TARJETAS */}
            {evaluacionesExistentes.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                    <div className="bg-slate-50 dark:bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Aún no hay evaluaciones creadas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    {evaluacionesExistentes.map((eva) => (
                        <EvaluacionCard
                            key={eva.id_evaluacion}
                            eva={eva}
                            getLinkExamen={getLinkExamen}
                            handleToggleEstado={handleToggleEstado}
                            handleEditar={handleEditar}
                            handleEliminarExamen={handleEliminarExamen}
                            handleVerResultados={handleVerResultados}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}