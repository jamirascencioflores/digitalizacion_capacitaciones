'use client';
import { useState } from 'react';
import { Plus, Trash2, ExternalLink, BarChart2, Save, X, AlertTriangle, Pencil } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
// 🟢 IMPORTAMOS deleteIntento
import { createEvaluacion, updateEvaluacion, getLinkExamen, deleteEvaluacion, getResultados, deleteIntento } from '@/services/evaluacion.service';

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
    // --- ESTADOS PARA MODAL RESULTADOS ---
    const [verResultados, setVerResultados] = useState(false);
    const [listaResultados, setListaResultados] = useState<ResultadoAlumno[]>([]);
    const [loadingResultados, setLoadingResultados] = useState(false);

    // --- ESTADOS PARA FORMULARIO ---
    const [modoFormulario, setModoFormulario] = useState(false);
    const [idEdicion, setIdEdicion] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [titulo, setTitulo] = useState('');
    const [tipo, setTipo] = useState('PRE_TEST');

    const [preguntas, setPreguntas] = useState<PreguntaDraft[]>([
        { enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }
    ]);

    // --- LÓGICA DE PREGUNTAS ---
    const addPregunta = () => {
        setPreguntas([...preguntas, { enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]);
    };
    const removePregunta = (idx: number) => setPreguntas(preguntas.filter((_, i) => i !== idx));
    const updatePregunta = (idx: number, field: keyof PreguntaDraft, value: string | number) => {
        const nuevas = [...preguntas];
        (nuevas[idx][field] as string | number) = value;
        setPreguntas(nuevas);
    };
    const updateOpcion = (idxPreg: number, idxOp: number, text: string) => {
        const nuevas = [...preguntas];
        nuevas[idxPreg].opciones[idxOp].texto = text;
        setPreguntas(nuevas);
    };
    const setCorrecta = (idxPreg: number, idxOp: number) => {
        const nuevas = [...preguntas];
        nuevas[idxPreg].opciones.forEach((op) => op.es_correcta = false);
        nuevas[idxPreg].opciones[idxOp].es_correcta = true;
        setPreguntas(nuevas);
    };
    const addOpcion = (idxPreg: number) => {
        const nuevas = [...preguntas];
        if (nuevas[idxPreg].opciones.length >= 5) return;
        nuevas[idxPreg].opciones.push({ texto: '', es_correcta: false });
        setPreguntas(nuevas);
    };

    // --- ACCIONES GENERALES ---
    const handleEliminarExamen = async (id: number) => {
        if (!confirm("¿Estás seguro? Se borrarán también las notas.")) return;
        try {
            await deleteEvaluacion(id);
            onRecargar();
        } catch (e) {
            console.error(e);
            alert("Error al eliminar");
        }
    };

    // --- ACCIONES DE RESULTADOS ---
    const handleVerResultados = async (id_evaluacion: number) => {
        setLoadingResultados(true);
        setVerResultados(true);
        try {
            const data = await getResultados(id_evaluacion);
            setListaResultados(data);
        } catch (error) {
            console.error(error);
            alert("Error al cargar resultados");
            setVerResultados(false);
        } finally {
            setLoadingResultados(false);
        }
    };

    // 🟢 NUEVO: Función para eliminar un intento específico (Corrección del error 'e')
    const handleEliminarIntento = async (id_intento: number) => {
        if (!confirm("¿Borrar el resultado de este alumno?")) return;
        try {
            await deleteIntento(id_intento);
            // Actualizamos la lista localmente
            setListaResultados(prev => prev.filter(r => r.id_intento !== id_intento));
        } catch (e) {
            console.error(e); // 🟢 AQUÍ ESTÁ LA CORRECCIÓN (Usamos 'e')
            alert("Error al eliminar el intento");
        }
    };

    // --- ACCIONES DE FORMULARIO ---
    const handleEditar = (eva: EvaluacionExistente) => {
        setIdEdicion(eva.id_evaluacion);
        setTitulo(eva.titulo);
        setTipo(eva.tipo);

        if (eva.preguntas && eva.preguntas.length > 0) {
            const preguntasFormateadas = eva.preguntas.map(p => ({
                enunciado: p.enunciado,
                puntos: p.puntos,
                opciones: p.opciones.map(o => ({
                    texto: o.texto,
                    es_correcta: o.es_correcta
                }))
            }));
            setPreguntas(preguntasFormateadas);
        } else {
            setPreguntas([{ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]);
        }

        setModoFormulario(true);
    };

    const cerrarFormulario = () => {
        setModoFormulario(false);
        setIdEdicion(null);
        setTitulo('');
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
            const payload = { id_capacitacion: idCapacitacion, tipo, titulo, preguntas };

            if (idEdicion) {
                await updateEvaluacion(idEdicion, payload);
                alert("Evaluación actualizada ✏️");
            } else {
                await createEvaluacion(payload);
                alert("Evaluación creada 🧠");
            }

            cerrarFormulario();
            onRecargar();
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    if (!modoFormulario) {
        return (
            <div className="space-y-6 animate-in fade-in relative">

                {/* MODAL DE RESULTADOS */}
                {verResultados && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="bg-blue-50 px-6 py-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                                    <BarChart2 size={20} /> Resultados del Examen
                                </h3>
                                <button onClick={() => setVerResultados(false)}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
                            </div>

                            <div className="p-0 overflow-y-auto flex-1">
                                {loadingResultados ? (
                                    <div className="p-10 text-center text-gray-500">Cargando notas...</div>
                                ) : listaResultados.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                        <BarChart2 size={40} className="mb-2 opacity-20" />
                                        <p>Aún nadie ha dado este examen.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">Fecha</th>
                                                <th className="px-6 py-3">DNI</th>
                                                <th className="px-6 py-3">Trabajador</th>
                                                <th className="px-6 py-3 text-right">Nota</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {listaResultados.map((res) => (
                                                <tr key={res.id_intento} className="hover:bg-gray-50 group">
                                                    <td className="px-6 py-3 text-gray-500">
                                                        {new Date(res.fecha_intento).toLocaleDateString()} {new Date(res.fecha_intento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-gray-600">{res.dni_trabajador}</td>
                                                    <td className="px-6 py-3 font-bold text-gray-800">{res.nombre_completo || 'Anónimo'}</td>
                                                    <td className="px-6 py-3 text-right flex items-center justify-end gap-3">
                                                        <span className={`px-2 py-1 rounded font-bold text-xs ${res.nota >= 13 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {res.nota}
                                                        </span>
                                                        {/* 🟢 BOTÓN ELIMINAR INTENTO */}
                                                        <button
                                                            onClick={() => handleEliminarIntento(res.id_intento)}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Eliminar este resultado"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-4 border-t bg-gray-50 text-right">
                                <span className="text-xs text-gray-500 mr-2">Total evaluados: {listaResultados.length}</span>
                                <button onClick={() => setVerResultados(false)} className="px-4 py-2 bg-white border rounded hover:bg-gray-100 text-sm font-medium">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">Evaluaciones</h3>
                    <button onClick={() => { cerrarFormulario(); setModoFormulario(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                        <Plus size={18} /> Crear Examen
                    </button>
                </div>

                {evaluacionesExistentes.length === 0 ? (
                    <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-400">No hay evaluaciones.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {evaluacionesExistentes.map((eva) => (
                            <div key={eva.id_evaluacion} className="bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition relative group">
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button onClick={() => handleEditar(eva)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><Pencil size={18} /></button>
                                    <button onClick={() => handleEliminarExamen(eva.id_evaluacion)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 size={18} /></button>
                                </div>

                                <div className="flex justify-between items-start mb-4 pr-16">
                                    <div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${eva.tipo === 'PRE_TEST' ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'}`}>{eva.tipo.replace('_', ' ')}</span>
                                        <h4 className="font-bold text-gray-800 mt-2">{eva.titulo}</h4>
                                        <p className="text-xs text-gray-500 mt-1">Preguntas: {eva.preguntas?.length || 0}</p>
                                    </div>
                                    <div className="bg-white p-2 border rounded"><QRCodeSVG value={getLinkExamen(eva.id_evaluacion)} size={50} /></div>
                                </div>
                                <div className="flex gap-2 text-sm">
                                    <a href={getLinkExamen(eva.id_evaluacion)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border py-2 rounded text-blue-600 hover:bg-blue-50"><ExternalLink size={16} /> Link</a>
                                    <button onClick={() => handleVerResultados(eva.id_evaluacion)} className="flex-1 flex items-center justify-center gap-2 border py-2 rounded text-green-600 hover:bg-green-50"><BarChart2 size={16} /> Resultados</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VISTA: FORMULARIO (Crear/Editar) ---
    return (
        <div className="bg-gray-50 p-6 rounded-xl border animate-in slide-in-from-right-10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-gray-800">{idEdicion ? 'Editar Examen' : 'Nuevo Examen'}</h3>
                <button onClick={cerrarFormulario} className="text-gray-500 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
                    <input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: Examen de Salida" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                        <option value="PRE_TEST">Pre-Test</option>
                        <option value="POST_TEST">Post-Test</option>
                        <option value="SATISFACCION">Satisfacción</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4 mb-8">
                {preguntas.map((preg, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between mb-3">
                            <span className="font-bold text-blue-600">Pregunta {idx + 1}</span>
                            <button onClick={() => removePregunta(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                        </div>
                        <input value={preg.enunciado} onChange={e => updatePregunta(idx, 'enunciado', e.target.value)} className="w-full border rounded px-3 py-2 mb-3 bg-gray-50 font-medium" placeholder="Escribe la pregunta..." />

                        <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                            {!preg.opciones.some(op => op.es_correcta) && (
                                <p className="text-xs text-amber-600 flex items-center gap-1 mb-2"><AlertTriangle size={12} /> Selecciona la respuesta correcta</p>
                            )}
                            {preg.opciones.map((op, opIdx) => (
                                <div key={opIdx} className="flex items-center gap-2">
                                    <input type="radio" name={`correcta-${idx}`} checked={op.es_correcta} onChange={() => setCorrecta(idx, opIdx)} className="w-4 h-4 text-green-600 cursor-pointer" />
                                    <input value={op.texto} onChange={e => updateOpcion(idx, opIdx, e.target.value)} className={`flex-1 border-b px-2 py-1 outline-none ${op.es_correcta ? 'text-green-700 font-bold border-green-500' : 'text-gray-600'}`} placeholder={`Opción ${opIdx + 1}`} />
                                </div>
                            ))}
                            {preg.opciones.length < 5 && <button onClick={() => addOpcion(idx)} className="text-xs text-blue-500 hover:underline mt-1">+ Opción</button>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between">
                <button onClick={addPregunta} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50">+ Pregunta</button>
                <button onClick={handleGuardar} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                    <Save size={18} /> {saving ? 'Guardando...' : (idEdicion ? 'Actualizar' : 'Guardar')}
                </button>
            </div>
        </div>
    );
}