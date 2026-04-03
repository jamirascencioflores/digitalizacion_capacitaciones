'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { X, Save, Trash2, Plus, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OpcionDraft {
    texto: string;
    es_correcta: boolean;
}

interface PreguntaDraft {
    enunciado: string;
    puntos: number;
    opciones: OpcionDraft[];
}

interface FormValues {
    titulo: string;
    tipo: string;
    duracion: string;
    preguntas: PreguntaDraft[];
}

interface Props {
    idEdicion: number | null;
    idCapacitacion: number;
    initialData?: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    saving: boolean;
}

export default function EvaluacionForm({
    idEdicion,
    idCapacitacion,
    initialData,
    onClose,
    onSave,
    saving
}: Props) {
    const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

    const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            titulo: '',
            tipo: 'PRE_TEST',
            duracion: '',
            preguntas: [
                { enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "preguntas"
    });

    // ✨ SOLUCIÓN AL AVISO: Usar useWatch en lugar de watch()
    const preguntasObservadas = useWatch({
        control,
        name: 'preguntas'
    }) || [];

    useEffect(() => {
        if (initialData) {
            reset({
                titulo: initialData.titulo,
                tipo: initialData.tipo,
                duracion: '',
                preguntas: initialData.preguntas?.map((p: any) => ({
                    enunciado: p.enunciado,
                    puntos: p.puntos,
                    opciones: p.opciones.map((o: any) => ({ texto: o.texto, es_correcta: o.es_correcta }))
                })) || [{ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] }]
            });
        }
    }, [initialData, reset]);

    const onSubmit = async (data: FormValues) => {
        setErrorValidacion(null);

        for (let i = 0; i < data.preguntas.length; i++) {
            if (!data.preguntas[i].opciones.some(op => op.es_correcta)) {
                setErrorValidacion(`Falta marcar la respuesta correcta en la Pregunta ${i + 1}`);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                return;
            }
        }

        const payload = {
            id_capacitacion: idCapacitacion,
            titulo: data.titulo,
            tipo: data.tipo,
            preguntas: data.preguntas,
            minutos_duracion: data.duracion ? parseInt(data.duracion) : undefined
        };

        await onSave(payload);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-600/20">
                        {idEdicion ? <Save size={24} /> : <Plus size={24} />}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">
                            {idEdicion ? 'Editar Examen' : 'Nueva Evaluación'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Configura las preguntas y opciones</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all p-2 rounded-full"
                >
                    <X size={28} />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* CAMPOS GENERALES */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Título del Examen <span className="text-rose-500">*</span></label>
                        <input
                            {...register('titulo', { required: true })}
                            className={`w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white ${errors.titulo ? 'border-rose-400 bg-rose-50' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'}`}
                            placeholder="Ej: Evaluación de Seguridad y Salud"
                        />
                        {errors.titulo && <span className="text-[10px] font-black uppercase text-rose-500 mt-2 block animate-pulse">Este campo es obligatorio</span>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Tipo de Prueba</label>
                        <select
                            {...register('tipo')}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold cursor-pointer focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                        >
                            <option value="PRE_TEST">Pre-Test</option>
                            <option value="POST_TEST">Post-Test</option>
                            <option value="SATISFACCION">Satisfacción</option>
                        </select>
                    </div>

                    <div>
                        <label className="flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 items-center gap-1.5">
                            <Clock size={14} className="text-amber-500" /> Tiempo Límite
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                {...register('duracion')}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                                placeholder="Opcional"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black uppercase">min</span>
                        </div>
                    </div>
                </div>

                {/* LISTADO DE PREGUNTAS */}
                <div className="space-y-6">
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        Preguntas y Respuestas
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs">
                            {fields.length} añadidas
                        </span>
                    </h4>

                    {fields.map((field, index) => (
                        <div key={field.id} className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:border-blue-200 dark:hover:border-slate-600">
                            <div className="flex justify-between items-center mb-6">
                                <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-md shadow-blue-600/20">
                                    Pregunta {index + 1}
                                </span>
                                {fields.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-slate-400 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                                        title="Eliminar pregunta"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>

                            <input
                                {...register(`preguntas.${index}.enunciado` as const, { required: true })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-5 py-4 mb-6 text-slate-800 dark:text-white font-bold text-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none placeholder:font-medium placeholder:text-slate-400 transition-all"
                                placeholder="Escribe el enunciado de la pregunta aquí..."
                            />

                            <div className="space-y-3 ml-2 border-l-4 border-blue-100 dark:border-slate-700 pl-6 py-2">
                                <label className="text-[11px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                                    Opciones <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium normal-case">Marca la correcta</span>
                                </label>

                                <div className="space-y-3">
                                    {preguntasObservadas[index]?.opciones?.map((opcion, optIdx, arregloOpciones) => (
                                        <div key={optIdx} className="group flex items-center gap-4">
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <input
                                                    type="radio"
                                                    name={`preguntas.${index}.correcta`}
                                                    checked={opcion.es_correcta}
                                                    onChange={() => {
                                                        const currentOptions = getValues(`preguntas.${index}.opciones`);
                                                        const updatedOptions = currentOptions.map((o, i) => ({
                                                            ...o,
                                                            es_correcta: i === optIdx
                                                        }));
                                                        setValue(`preguntas.${index}.opciones`, updatedOptions);
                                                    }}
                                                    className="w-6 h-6 accent-emerald-500 cursor-pointer shadow-sm hover:scale-110 transition-transform"
                                                    title="Marcar como respuesta correcta"
                                                />
                                            </div>

                                            <input
                                                {...register(`preguntas.${index}.opciones.${optIdx}.texto` as const, { required: true })}
                                                className={`flex-1 bg-transparent border-b-2 px-2 py-2 outline-none transition-all text-sm md:text-base ${opcion.es_correcta
                                                    ? 'text-emerald-700 dark:text-emerald-400 font-extrabold border-emerald-500'
                                                    : 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 group-hover:border-slate-400 font-medium'
                                                    }`}
                                                placeholder={`Opción ${optIdx + 1}`}
                                            />

                                            {arregloOpciones.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = getValues(`preguntas.${index}.opciones`);
                                                        setValue(`preguntas.${index}.opciones`, current.filter((_, i) => i !== optIdx));
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all rounded-xl p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {(preguntasObservadas[index]?.opciones?.length || 0) < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = getValues(`preguntas.${index}.opciones`);
                                            setValue(`preguntas.${index}.opciones`, [...current, { texto: '', es_correcta: false }]);
                                        }}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-4 flex items-center gap-1.5 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors w-fit"
                                    >
                                        <Plus size={14} strokeWidth={3} /> Añadir alternativa
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 🟢 ALERTA DE ERROR DE VALIDACIÓN */}
                {errorValidacion && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <AlertTriangle className="text-rose-500 shrink-0" size={24} />
                        <div>
                            <p className="text-rose-800 font-extrabold text-sm">No se puede guardar el examen</p>
                            <p className="text-rose-600 text-xs font-medium">{errorValidacion}</p>
                        </div>
                    </div>
                )}

                {/* ACCIONES FINALES */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => append({ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] })}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-800 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-xl font-extrabold hover:bg-blue-50 dark:hover:bg-slate-700 transition shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={20} strokeWidth={3} /> Nueva Pregunta
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 text-white rounded-xl font-extrabold hover:bg-emerald-700 flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={20} /> {idEdicion ? 'Actualizar Examen' : 'Guardar Evaluación'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}