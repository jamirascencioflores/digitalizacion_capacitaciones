'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, X, Trash2, AlertTriangle, Power } from 'lucide-react';
import * as XLSX from 'xlsx';

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
    // --- ESTADOS DE DATOS ---
    const [verResultados, setVerResultados] = useState(false);
    const [listaResultados, setListaResultados] = useState<ResultadoAlumno[]>([]);
    const [loadingResultados, setLoadingResultados] = useState(false);

    const [modoFormulario, setModoFormulario] = useState(false);
    const [idEdicion, setIdEdicion] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [dataEdicion, setDataEdicion] = useState<any>(null);

    // --- 🟢 NUEVOS ESTADOS DE UI (Alertas y Modales) ---
    const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
    const [modalConfirmacion, setModalConfirmacion] = useState<{
        show: boolean;
        tipo: 'eliminar_intento' | 'eliminar_examen' | 'cambiar_estado';
        titulo: string;
        mensaje: string;
        accion: () => Promise<void>;
        botonTexto: string;
        botonClase: string;
        icono: React.ReactNode;
    } | null>(null);

    // Helper para mostrar alerta y cerrarla automático
    const mostrarAlerta = (tipo: 'exito' | 'error', texto: string) => {
        setMensajeAlerta({ tipo, texto });
        setTimeout(() => setMensajeAlerta(null), 4000);
    };

    // --- ACCIONES DE RESULTADOS ---
    const handleExportarExcel = () => {
        if (listaResultados.length === 0) {
            mostrarAlerta('error', "No hay datos para exportar");
            return;
        }

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
        mostrarAlerta('exito', "Excel generado correctamente 📊");
    };

    const handleVerResultados = async (id_evaluacion: number) => {
        setLoadingResultados(true);
        setVerResultados(true);
        try {
            const data = await getResultados(id_evaluacion);
            setListaResultados(data);
        } catch (error) {
            console.error(error);
            mostrarAlerta('error', "Error al cargar los resultados del examen");
            setVerResultados(false);
        } finally {
            setLoadingResultados(false);
        }
    };

    const handleEliminarIntento = (id_intento: number) => {
        setModalConfirmacion({
            show: true,
            tipo: 'eliminar_intento',
            titulo: '¿Eliminar intento?',
            mensaje: 'Al borrar este resultado, el alumno podrá volver a dar el examen. Esta acción no se puede deshacer.',
            botonTexto: 'Sí, Eliminar Intento',
            botonClase: 'bg-red-600 hover:bg-red-700',
            icono: <Trash2 size={24} className="text-red-500" />,
            accion: async () => {
                try {
                    await deleteIntento(id_intento);
                    setListaResultados(prev => prev.filter(r => r.id_intento !== id_intento));
                    setModalConfirmacion(null);
                    mostrarAlerta('exito', "Intento eliminado correctamente 🗑️");
                } catch (e) {
                    console.error(e);
                    mostrarAlerta('error', "Error al intentar eliminar el registro");
                }
            }
        });
    };

    // --- ACCIONES DE EVALUACIÓN ---
    const handleToggleEstado = (eva: EvaluacionExistente) => {
        const nuevoEstado = !eva.estado;
        const accionTexto = nuevoEstado ? 'Abrir' : 'Cerrar';

        setModalConfirmacion({
            show: true,
            tipo: 'cambiar_estado',
            titulo: `¿${accionTexto} este examen?`,
            mensaje: nuevoEstado
                ? 'Los alumnos podrán acceder al enlace y enviar sus respuestas.'
                : 'Se bloqueará el acceso al enlace y nadie más podrá responder.',
            botonTexto: `Sí, ${accionTexto} Examen`,
            botonClase: nuevoEstado ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700',
            icono: <Power size={24} className={nuevoEstado ? 'text-green-500' : 'text-orange-500'} />,
            accion: async () => {
                try {
                    await toggleEstadoExamen(eva.id_evaluacion, nuevoEstado);
                    setModalConfirmacion(null);
                    mostrarAlerta('exito', `Examen ${nuevoEstado ? 'abierto' : 'cerrado'} correctamente 🔒`);
                    onRecargar();
                } catch (error) {
                    console.error(error);
                    mostrarAlerta('error', "Error al intentar cambiar el estado del examen");
                }
            }
        });
    };

    const handleEliminarExamen = (id: number) => {
        setModalConfirmacion({
            show: true,
            tipo: 'eliminar_examen',
            titulo: '¿Eliminar Examen Permanente?',
            mensaje: 'Esta acción borrará el examen, todas sus preguntas y todas las notas de los alumnos. NO se puede deshacer.',
            botonTexto: 'Borrar Todo',
            botonClase: 'bg-red-600 hover:bg-red-700',
            icono: <AlertTriangle size={24} className="text-red-600" />,
            accion: async () => {
                try {
                    await deleteEvaluacion(id);
                    setModalConfirmacion(null);
                    mostrarAlerta('exito', "Examen eliminado definitivamente 🗑️");
                    onRecargar();
                } catch (e) {
                    console.error(e);
                    mostrarAlerta('error', "No se pudo eliminar el examen");
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
                mostrarAlerta('exito', "Examen actualizado correctamente ✏️");
            } else {
                await createEvaluacion(payload);
                mostrarAlerta('exito', "Evaluación creada con éxito ✨");
            }

            // 1. Cerramos el formulario y limpiamos estados
            setModoFormulario(false);
            setIdEdicion(null);

            // 2. Le damos un respiro de 500ms a la DB para que termine de escribir
            // y luego mandamos a recargar la lista en el Padre
            setTimeout(() => {
                onRecargar();
            }, 500);

        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta('error', "Ocurrió un error al intentar guardar los cambios");
        } finally {
            setSaving(false);
        }
        // ❌ Eliminé el código duplicado que tenías aquí afuera
    };

    if (modoFormulario) {
        return (
            <div className="relative">
                {/* 🟢 ALERTA EN MODO FORMULARIO */}
                {mensajeAlerta && (
                    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-100 w-[95%] max-w-md p-4 rounded-xl flex items-start gap-3 shadow-2xl border transition-all animate-in slide-in-from-top-8 fade-in ${mensajeAlerta.tipo === 'error' ? 'bg-white dark:bg-slate-900 border-red-500 text-red-800 dark:text-red-200' : 'bg-white dark:bg-slate-900 border-green-500 text-green-800 dark:text-green-200'}`}>
                        <div className={`p-2 rounded-full ${mensajeAlerta.tipo === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {mensajeAlerta.tipo === 'error' ? <AlertCircle className="text-red-600 dark:text-red-400" size={24} /> : <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />}
                        </div>
                        <div className="flex-1 pt-1">
                            <h4 className="font-extrabold text-sm">{mensajeAlerta.tipo === 'error' ? 'Acción Requerida' : 'Operación Exitosa'}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{mensajeAlerta.texto}</p>
                        </div>
                        <button type="button" onClick={() => setMensajeAlerta(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                )}

                <EvaluacionForm
                    idEdicion={idEdicion}
                    idCapacitacion={idCapacitacion}
                    initialData={dataEdicion}
                    onClose={() => setModoFormulario(false)}
                    onSave={handleGuardar}
                    saving={saving}
                />
            </div>
        );
    }

    return (
        <div className="px-2 md:px-6 py-4 space-y-6 animate-in fade-in relative transition-all duration-500">

            {/* 🟢 ALERTA PRINCIPAL FLOTANTE */}
            {mensajeAlerta && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-100 w-[95%] max-w-md p-4 rounded-xl flex items-start gap-3 shadow-2xl border transition-all animate-in slide-in-from-top-8 fade-in ${mensajeAlerta.tipo === 'error' ? 'bg-white dark:bg-slate-900 border-red-500 text-red-800 dark:text-red-200' : 'bg-white dark:bg-slate-900 border-green-500 text-green-800 dark:text-green-200'}`}>
                    <div className={`p-2 rounded-full ${mensajeAlerta.tipo === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {mensajeAlerta.tipo === 'error' ? <AlertCircle className="text-red-600 dark:text-red-400" size={24} /> : <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h4 className="font-extrabold text-sm">{mensajeAlerta.tipo === 'error' ? 'Acción Requerida' : 'Operación Exitosa'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{mensajeAlerta.texto}</p>
                    </div>
                    <button type="button" onClick={() => setMensajeAlerta(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            )}

            {/* 🟢 MODAL DE CONFIRMACIÓN DINÁMICO */}
            {modalConfirmacion?.show && (
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-inner ${modalConfirmacion.tipo === 'eliminar_examen' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                            {modalConfirmacion.icono}
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">
                            {modalConfirmacion.titulo}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                            {modalConfirmacion.mensaje}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalConfirmacion(null)}
                                className="flex-1 py-3 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={modalConfirmacion.accion}
                                className={`flex-1 py-3 font-bold text-white rounded-xl transition shadow-lg ${modalConfirmacion.botonClase}`}
                            >
                                {modalConfirmacion.botonTexto}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            handleToggleEstado={() => handleToggleEstado(eva)}
                            handleEditar={() => handleEditar(eva)}
                            handleEliminarExamen={() => handleEliminarExamen(eva.id_evaluacion)}
                            handleVerResultados={() => handleVerResultados(eva.id_evaluacion)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}