'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import {
    X,
    Save,
    Trash2,
    Plus,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

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
    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
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
        // Validación manual de respuestas correctas
        for (let i = 0; i < data.preguntas.length; i++) {
            if (!data.preguntas[i].opciones.some(op => op.es_correcta)) {
                toast.error(`La pregunta ${i + 1} debe tener al menos una respuesta correcta.`);
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
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl animate-in slide-in-from-right-10 duration-300 shadow-xl">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/30">
                        {idEdicion ? <Save size={20} /> : <Plus size={20} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">
                            {idEdicion ? 'Editar Examen' : 'Nueva Evaluación'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Completa la información del examen</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* CAMPOS GENERALES */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Título del Examen</label>
                        <input
                            {...register('titulo', { required: true })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100"
                            placeholder="Ej: Examen de Seguridad en el Trabajo"
                        />
                        {errors.titulo && <span className="text-[10px] text-rose-500 mt-1 block">El título es obligatorio</span>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                        <select
                            {...register('tipo')}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                        >
                            <option value="PRE_TEST">Pre-Test</option>
                            <option value="POST_TEST">Post-Test</option>
                            <option value="SATISFACCION">Satisfacción</option>
                        </select>
                    </div>

                    <div>
                        <label className="flex text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 items-center gap-1.5">
                            <Clock size={12} /> Auto-Cierre
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                {...register('duracion')}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                                placeholder="Minutos"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">min</span>
                        </div>
                    </div>
                </div>

                {/* LISTADO DE PREGUNTAS */}
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Preguntas del examen
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs">
                            {fields.length}
                        </span>
                    </h4>

                    {fields.map((field, index) => (
                        <div key={field.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 scale-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    Pregunta {index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <input
                                {...register(`preguntas.${index}.enunciado` as const, { required: true })}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 mb-6 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none placeholder:font-normal placeholder:text-slate-400 shadow-inner"
                                placeholder="¿Cuál es el procedimiento en caso de incendio?"
                            />

                            <div className="space-y-3 ml-2 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-2">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-4">Opciones de respuesta</label>

                                <div className="space-y-3">
                                    {watch(`preguntas.${index}.opciones`).map((_, optIdx) => (
                                        <div key={optIdx} className="group flex items-center gap-3">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name={`preguntas.${index}.correcta`}
                                                    id={`p${index}-o${optIdx}`}
                                                    checked={watch(`preguntas.${index}.opciones.${optIdx}.es_correcta`)}
                                                    onChange={() => {
                                                        const currentOptions = watch(`preguntas.${index}.opciones`);
                                                        const updatedOptions = currentOptions.map((o, i) => ({
                                                            ...o,
                                                            es_correcta: i === optIdx
                                                        }));
                                                        setValue(`preguntas.${index}.opciones`, updatedOptions);
                                                    }}
                                                    className="w-5 h-5 accent-emerald-500 cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                {...register(`preguntas.${index}.opciones.${optIdx}.texto` as const, { required: true })}
                                                className={`flex-1 bg-transparent border-b border-slate-100 dark:border-slate-800 px-2 py-1.5 outline-none transition-all text-sm ${watch(`preguntas.${index}.opciones.${optIdx}.es_correcta`)
                                                    ? 'text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500'
                                                    : 'text-slate-600 dark:text-slate-400 group-hover:border-slate-300'
                                                    }`}
                                                placeholder={`Opción ${optIdx + 1}`}
                                            />
                                            {watch(`preguntas.${index}.opciones`).length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = watch(`preguntas.${index}.opciones`);
                                                        setValue(`preguntas.${index}.opciones`, current.filter((_, i) => i !== optIdx));
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 transition-all rounded-full p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {watch(`preguntas.${index}.opciones`).length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch(`preguntas.${index}.opciones`);
                                            setValue(`preguntas.${index}.opciones`, [...current, { texto: '', es_correcta: false }]);
                                        }}
                                        className="text-[10px] text-blue-500 font-bold uppercase mt-4 flex items-center gap-1 hover:text-blue-600 transition-colors"
                                    >
                                        <Plus size={10} strokeWidth={3} /> Agregar Opción
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ACCIONES FINALES */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => append({ enunciado: '', puntos: 4, opciones: [{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }] })}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={18} strokeWidth={2.5} /> Añadir Pregunta
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> {idEdicion ? 'Actualizar Examen' : 'Guardar Evaluación'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
