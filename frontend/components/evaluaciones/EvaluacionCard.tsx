'use client';

import {
    Trash2,
    ExternalLink,
    BarChart2,
    Pencil,
    Clock,
    Power,
    X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface EvaluacionExistente {
    id_evaluacion: number;
    titulo: string;
    tipo: string;
    estado: boolean;
    fecha_cierre?: string;
    preguntas?: any[];
}

interface Props {
    eva: EvaluacionExistente;
    getLinkExamen: (id: number) => string;
    handleToggleEstado: (eva: EvaluacionExistente) => void;
    handleEditar: (eva: EvaluacionExistente) => void;
    handleEliminarExamen: (id: number) => void;
    handleVerResultados: (id: number) => void;
}

export default function EvaluacionCard({
    eva,
    getLinkExamen,
    handleToggleEstado,
    handleEditar,
    handleEliminarExamen,
    handleVerResultados
}: Props) {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm hover:shadow-md transition flex flex-col ${!eva.estado ? 'opacity-75 grayscale-[0.5]' : ''}`}>

            {/* CABECERA: Tipo y Acciones */}
            <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${eva.tipo === 'PRE_TEST' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'
                    }`}>
                    {eva.tipo.replace('_', ' ')}
                </span>

                <div className="flex items-center gap-1">
                    {/* Switch de Estado */}
                    <button
                        onClick={() => handleToggleEstado(eva)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${eva.estado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                            }`}
                        title={eva.estado ? 'Cerrar examen' : 'Abrir examen'}
                    >
                        <Power size={12} strokeWidth={3} />
                        {eva.estado ? 'ACTIVO' : 'CERRADO'}
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                    <button
                        onClick={() => handleEditar(eva)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        title="Editar examen"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => handleEliminarExamen(eva.id_evaluacion)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                        title="Eliminar examen"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* CUERPO: Título, Info y QR */}
            <div className="flex justify-between items-start mb-6 gap-4">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-2 truncate">
                        {eva.titulo}
                    </h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            {eva.preguntas?.length || 0} Preguntas
                        </p>
                        {eva.fecha_cierre && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                <Clock size={14} />
                                Cierra: {new Date(eva.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-1.5 border border-slate-100 rounded-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <QRCodeSVG value={getLinkExamen(eva.id_evaluacion)} size={60} />
                </div>
            </div>

            {/* FOOTER: Acciones Principales */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-dashed border-slate-100 dark:border-slate-800">
                {eva.estado ? (
                    <a
                        href={getLinkExamen(eva.id_evaluacion)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-200 dark:shadow-none"
                    >
                        <ExternalLink size={14} /> Link del Examen
                    </a>
                ) : (
                    <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 py-2 rounded-lg text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed text-xs font-semibold"
                    >
                        <X size={14} /> Examen Cerrado
                    </button>
                )}
                <button
                    onClick={() => handleVerResultados(eva.id_evaluacion)}
                    className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 py-2 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                    <BarChart2 size={14} className="text-emerald-500" /> Ver Resultados
                </button>
            </div>
        </div>
    );
}
