'use client';
import { useState } from 'react';
import { Plus, Trash2, ExternalLink, BarChart2, Save, X, AlertTriangle, Pencil, Download, Clock, Power } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { createEvaluacion, updateEvaluacion, getLinkExamen, deleteEvaluacion, getResultados, deleteIntento, toggleEstadoExamen } from '@/services/evaluacion.service';

interface OpcionDraft {
    texto: string;
    es_correcta: boolean;
}

interface PreguntaDraft {
    enunciado: string;
    puntos: number;
    opciones: OpcionDraft[];
}

interface EvaluacionExistente {
    id_evaluacion: number;
    titulo: string;
    tipo: string;
    estado: boolean;
    fecha_cierre?: string;
    preguntas?: {
        enunciado: string;
        puntos: number;
        opciones: {
            texto: string;
            es_correcta: boolean;
        }[]
    }[];
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

    const [titulo, setTitulo] = useState('');
    const [tipo, setTipo] = useState('PRE_TEST');
    const [duracion, setDuracion] = useState('');

    const [preguntas, setPreguntas] = useState<PreguntaDraft[]>([
        { enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }
    ]);

    // --- LÓGICA DE PREGUNTAS ---
    const addPregunta = () => { setPreguntas([...preguntas, { enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]); };
    const removePregunta = (idx: number) => setPreguntas(preguntas.filter((_, i) => i !== idx));
    const updatePregunta = (idx: number, field: keyof PreguntaDraft, value: string | number) => { const n = [...preguntas]; (n[idx][field] as string | number) = value; setPreguntas(n); };
    const updateOpcion = (idxPreg: number, idxOp: number, text: string) => { const n = [...preguntas]; n[idxPreg].opciones[idxOp].texto = text; setPreguntas(n); };
    const setCorrecta = (idxPreg: number, idxOp: number) => { const n = [...preguntas]; n[idxPreg].opciones.forEach(o => o.es_correcta = false); n[idxPreg].opciones[idxOp].es_correcta = true; setPreguntas(n); };
    const addOpcion = (idxPreg: number) => { const n = [...preguntas]; if (n[idxPreg].opciones.length < 5) n[idxPreg].opciones.push({ texto: '', es_correcta: false }); setPreguntas(n); };

    // --- ACCIONES ---
    const handleExportarExcel = () => {
        if (listaResultados.length === 0) return alert("No hay datos para exportar");
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
    };

    const handleToggleEstado = async (eva: EvaluacionExistente) => {
        const nuevoEstado = !eva.estado;
        if (!confirm(`¿Deseas ${nuevoEstado ? 'ABRIR' : 'CERRAR'} este examen manualmente?`)) return;
        try {
            await toggleEstadoExamen(eva.id_evaluacion, nuevoEstado);
            onRecargar();
        } catch (error) {
            console.error(error);
            alert("Error al cambiar estado");
        }
    };

    const handleEliminarExamen = async (id: number) => {
        if (!confirm("¿Estás seguro? Se borrarán también las notas.")) return;
        try { await deleteEvaluacion(id); onRecargar(); } catch (e) { console.error(e); alert("Error al eliminar"); }
    };

    const handleVerResultados = async (id_evaluacion: number) => {
        setLoadingResultados(true); setVerResultados(true);
        try { const data = await getResultados(id_evaluacion); setListaResultados(data); }
        catch (error) { console.error(error); alert("Error al cargar resultados"); setVerResultados(false); }
        finally { setLoadingResultados(false); }
    };

    const handleEliminarIntento = async (id_intento: number) => {
        if (!confirm("¿Borrar el resultado de este alumno?")) return;
        try { await deleteIntento(id_intento); setListaResultados(prev => prev.filter(r => r.id_intento !== id_intento)); }
        catch (e) { console.error(e); alert("Error al eliminar el intento"); }
    };

    const handleEditar = (eva: EvaluacionExistente) => {
        setIdEdicion(eva.id_evaluacion); setTitulo(eva.titulo); setTipo(eva.tipo); setDuracion('');
        if (eva.preguntas && eva.preguntas.length > 0) {
            const preguntasFormateadas = eva.preguntas.map(p => ({
                enunciado: p.enunciado, puntos: p.puntos,
                opciones: p.opciones.map(o => ({ texto: o.texto, es_correcta: o.es_correcta }))
            }));
            setPreguntas(preguntasFormateadas);
        } else { setPreguntas([{ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]); }
        setModoFormulario(true);
    };

    const cerrarFormulario = () => {
        setModoFormulario(false); setIdEdicion(null); setTitulo(''); setDuracion('');
        setPreguntas([{ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]);
    };

    const handleGuardar = async () => {
        if (!titulo.trim()) return alert("Falta título");
        for (let i = 0; i < preguntas.length; i++) {
            if (!preguntas[i].enunciado.trim()) return alert(`Pregunta ${i + 1} sin enunciado.`);
            if (!preguntas[i].opciones.some(op => op.es_correcta)) return alert(`Pregunta ${i + 1} sin respuesta correcta.`);
        }
        setSaving(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = { id_capacitacion: idCapacitacion, tipo, titulo, preguntas };
            if (duracion && parseInt(duracion) > 0) payload.minutos_duracion = parseInt(duracion);
            if (idEdicion) await updateEvaluacion(idEdicion, payload); else await createEvaluacion(payload);
            alert("Guardado con éxito"); cerrarFormulario(); onRecargar();
        } catch (error) { console.error(error); alert("Error al guardar"); } finally { setSaving(false); }
    };

    if (!modoFormulario) {
        return (
            <div className="space-y-6 animate-in fade-in relative">
                {/* MODAL RESULTADOS */}
                {verResultados && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="bg-blue-50 px-6 py-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2"><BarChart2 size={20} /> Resultados</h3>
                                <button onClick={handleExportarExcel} className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2 text-sm hover:bg-green-700">
                                    <Download size={16} /> Excel
                                </button>
                                <button onClick={() => setVerResultados(false)}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
                            </div>
                            <div className="p-0 overflow-y-auto flex-1">
                                {loadingResultados ? <div className="p-10 text-center text-gray-500">Cargando notas...</div> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold sticky top-0">
                                            <tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">DNI</th><th className="px-6 py-3">Trabajador</th><th className="px-6 py-3 text-right">Nota</th><th className="px-6 py-3"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {listaResultados.map((res) => (
                                                <tr key={res.id_intento} className="hover:bg-gray-50 group">
                                                    <td className="px-6 py-3 text-gray-500">{new Date(res.fecha_intento).toLocaleDateString()} {new Date(res.fecha_intento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-3 font-mono text-gray-600">{res.dni_trabajador}</td>
                                                    <td className="px-6 py-3 font-bold text-gray-800">{res.nombre_completo || 'Anónimo'}</td>
                                                    <td className="px-6 py-3 text-right"><span className={`px-2 py-1 rounded font-bold text-xs ${res.nota >= 13 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{res.nota}</span></td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button onClick={() => handleEliminarIntento(res.id_intento)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-4 border-t bg-gray-50 text-right"><span className="text-xs text-gray-500 mr-2">Total evaluados: {listaResultados.length}</span><button onClick={() => setVerResultados(false)} className="px-4 py-2 bg-white border rounded hover:bg-gray-100 text-sm font-medium">Cerrar</button></div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">Evaluaciones</h3>
                    <button onClick={() => { cerrarFormulario(); setModoFormulario(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Crear Examen</button>
                </div>

                {evaluacionesExistentes.length === 0 ? (
                    <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-400">No hay evaluaciones.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {evaluacionesExistentes.map((eva) => (
                            <div key={eva.id_evaluacion} className={`bg-white border p-5 rounded-xl shadow-sm hover:shadow-md transition flex flex-col ${!eva.estado ? 'bg-gray-50 border-gray-200' : 'border-gray-200'}`}>

                                {/* 🟢 1. CABECERA ORDENADA: Tipo (Izq) - Botones (Der) */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${eva.tipo === 'PRE_TEST' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {eva.tipo.replace('_', ' ')}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {/* Botón Switch Grande */}
                                        <button
                                            onClick={() => handleToggleEstado(eva)}
                                            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shadow-sm ${eva.estado ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'}`}
                                        >
                                            <Power size={14} strokeWidth={3} />
                                            {eva.estado ? 'ABIERTO' : 'CERRADO'}
                                        </button>

                                        <div className="h-6 w-px bg-gray-300 mx-1"></div>

                                        <button onClick={() => handleEditar(eva)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={18} /></button>
                                        <button onClick={() => handleEliminarExamen(eva.id_evaluacion)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                                    </div>
                                </div>

                                {/* 🟢 2. CUERPO DE TARJETA: Info (Izq) - QR (Der) */}
                                <div className="flex justify-between items-start mb-6 gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 text-lg leading-tight mb-2">{eva.titulo}</h4>
                                        <div className="space-y-1">
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                                {eva.preguntas?.length || 0} Preguntas
                                            </p>
                                            {eva.fecha_cierre && (
                                                <p className="text-sm text-orange-600 font-medium flex items-center gap-2">
                                                    <Clock size={14} />
                                                    Cierra: {new Date(eva.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {/* QR Code sin solapamiento */}
                                    <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm shrink-0">
                                        <QRCodeSVG value={getLinkExamen(eva.id_evaluacion)} size={70} />
                                    </div>
                                </div>

                                {/* 3. FOOTER: BOTONES */}
                                <div className="flex gap-3 mt-auto pt-4 border-t border-dashed border-gray-200">
                                    {eva.estado ? (
                                        <a href={getLinkExamen(eva.id_evaluacion)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg text-blue-600 font-medium hover:bg-blue-50 transition"><ExternalLink size={18} /> Link</a>
                                    ) : (
                                        <button disabled className="flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed font-medium"><X size={18} /> Link Cerrado</button>
                                    )}
                                    <button onClick={() => handleVerResultados(eva.id_evaluacion)} className="flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg text-green-600 font-medium hover:bg-green-50 transition"><BarChart2 size={18} /> Resultados</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gray-50 p-6 rounded-xl border animate-in slide-in-from-right-10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-gray-800">{idEdicion ? 'Editar Examen' : 'Nuevo Examen'}</h3>
                <button onClick={cerrarFormulario} className="text-gray-500 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Título</label><input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: Examen de Salida" /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label><select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border rounded px-3 py-2 bg-white"><option value="PRE_TEST">Pre-Test</option><option value="POST_TEST">Post-Test</option><option value="SATISFACCION">Satisfacción</option></select></div>
                <div><label className="flex text-sm font-bold text-gray-700 mb-1 items-center gap-1"><Clock size={14} /> Auto-Cierre</label><div className="flex items-center gap-2"><input type="number" value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Minutos"/><span className="text-xs text-gray-500">min</span></div></div>            </div>
            <div className="space-y-4 mb-8">
                {preguntas.map((preg, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between mb-3"><span className="font-bold text-blue-600">Pregunta {idx + 1}</span><button onClick={() => removePregunta(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button></div>
                        <input value={preg.enunciado} onChange={e => updatePregunta(idx, 'enunciado', e.target.value)} className="w-full border rounded px-3 py-2 mb-3 bg-gray-50 font-medium" placeholder="Escribe la pregunta..." />
                        <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                            {!preg.opciones.some(op => op.es_correcta) && (<p className="text-xs text-amber-600 flex items-center gap-1 mb-2"><AlertTriangle size={12} /> Selecciona la respuesta correcta</p>)}
                            {preg.opciones.map((op, opIdx) => (<div key={opIdx} className="flex items-center gap-2"><input type="radio" name={`correcta-${idx}`} checked={op.es_correcta} onChange={() => setCorrecta(idx, opIdx)} className="w-4 h-4 text-green-600 cursor-pointer" /><input value={op.texto} onChange={e => updateOpcion(idx, opIdx, e.target.value)} className={`flex-1 border-b px-2 py-1 outline-none ${op.es_correcta ? 'text-green-700 font-bold border-green-500' : 'text-gray-600'}`} placeholder={`Opción ${opIdx + 1}`} /></div>))}
                            {preg.opciones.length < 5 && <button onClick={() => addOpcion(idx)} className="text-xs text-blue-500 hover:underline mt-1">+ Opción</button>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between"><button onClick={addPregunta} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50">+ Pregunta</button><button onClick={handleGuardar} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> {saving ? 'Guardando...' : (idEdicion ? 'Actualizar' : 'Guardar')}</button></div>
        </div>
    );
}