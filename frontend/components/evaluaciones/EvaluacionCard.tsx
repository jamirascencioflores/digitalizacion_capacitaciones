'use client';

import { Trash2, ExternalLink, BarChart2, Pencil, Clock, Power, X, Eye, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

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
    handleToggleEstado: () => void;
    handleEditar: () => void;
    handleEliminarExamen: () => void;
    handleVerResultados: () => void;
}

export default function EvaluacionCard({
    eva,
    getLinkExamen,
    handleToggleEstado,
    handleEditar,
    handleEliminarExamen,
    handleVerResultados
}: Props) {
    const [showBigQR, setShowBigQR] = useState(false);

    return (
        <>
            <div className={`bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full ${!eva.estado ? 'opacity-80 grayscale-[0.3]' : ''}`}>

                {/* CABECERA: Tipo y Acciones */}
                <div className="flex justify-between items-start mb-5">
                    <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-widest ${eva.tipo === 'PRE_TEST' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'}`}>
                        {eva.tipo.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/50 p-1 rounded-xl border border-gray-100 dark:border-slate-700">
                        <button
                            onClick={handleToggleEstado}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${eva.estado
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                                }`}
                            title={eva.estado ? 'Cerrar examen' : 'Abrir examen'}
                        >
                            <Power size={14} strokeWidth={2.5} />
                            {eva.estado ? 'ACTIVO' : 'CERRADO'}
                        </button>

                        <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                        <button
                            onClick={handleEditar}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Editar examen"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={handleEliminarExamen}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                            title="Eliminar examen"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* CUERPO: Título e Info */}
                <div className="flex justify-between items-start mb-6 gap-4">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-gray-900 dark:text-white text-xl leading-tight mb-3 line-clamp-2">
                            {eva.titulo}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                {eva.preguntas?.length || 0} Preguntas
                            </p>
                            {eva.fecha_cierre && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/10 px-2 py-0.5 rounded-md">
                                    <Clock size={14} />
                                    Cierra: {new Date(eva.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ✨ QR Code con Botón de Vista Previa */}
                    {eva.estado && (
                        <div className="relative group/qr shrink-0">
                            <div className="bg-white p-2 border-2 border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm transition-all duration-300 group-hover/qr:shadow-md">
                                <QRCodeSVG value={getLinkExamen(eva.id_evaluacion)} size={64} />
                            </div>

                            {/* Overlay con el Ojito */}
                            <button
                                onClick={() => setShowBigQR(true)}
                                className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] opacity-0 group-hover/qr:opacity-100 transition-opacity rounded-2xl flex items-center justify-center border-2 border-blue-500/50"
                                title="Ampliar código QR"
                            >
                                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg text-blue-600 dark:text-blue-400 transform scale-75 group-hover/qr:scale-100 transition-transform">
                                    <Eye size={18} strokeWidth={3} />
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* FOOTER: Acciones Principales */}
                <div className="flex gap-3 mt-auto pt-5 border-t border-dashed border-gray-200 dark:border-slate-800">
                    {eva.estado ? (
                        <a
                            href={getLinkExamen(eva.id_evaluacion)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            <ExternalLink size={16} /> Ver Examen
                        </a>
                    ) : (
                        <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 dark:border-slate-800 py-2.5 rounded-xl text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/50 cursor-not-allowed text-xs font-bold"
                        >
                            <X size={16} strokeWidth={3} /> Examen Cerrado
                        </button>
                    )}
                    <button
                        onClick={handleVerResultados}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 dark:border-slate-700 py-2.5 rounded-xl text-gray-700 dark:text-slate-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                        <BarChart2 size={16} className="text-emerald-500" /> Resultados
                    </button>
                </div>
            </div>

            {/* ✨ MODAL DE QR GIGANTE */}
            {showBigQR && (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest">Vista Previa QR</h3>
                            <button
                                onClick={() => setShowBigQR(false)}
                                className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border-4 border-gray-50 dark:border-slate-800 inline-block shadow-inner mb-6">
                            <QRCodeSVG
                                value={getLinkExamen(eva.id_evaluacion)}
                                size={220}
                                includeMargin={false}
                                level="H" // Alta corrección de errores para mejor escaneo
                            />
                        </div>

                        <div className="px-4">
                            <p className="text-gray-900 dark:text-white text-sm font-black mb-1 line-clamp-1">{eva.titulo}</p>
                            <p className="text-gray-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Escanea para iniciar el examen</p>
                        </div>

                        <button
                            onClick={() => window.print()}
                            className="mt-8 w-full py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95"
                        >
                            <Download size={16} strokeWidth={3} /> Descargar QR
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}