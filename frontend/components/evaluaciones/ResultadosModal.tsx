'use client';

import { X, BarChart2, Download, Trash2 } from 'lucide-react';
import Skeleton from '../ui/Skeleton';

interface ResultadoAlumno {
    id_intento: number;
    dni_trabajador: string;
    nombre_completo: string;
    nota: number;
    fecha_intento: string;
}

interface Props {
    verResultados: boolean;
    setVerResultados: (val: boolean) => void;
    listaResultados: ResultadoAlumno[];
    loadingResultados: boolean;
    handleExportarExcel: () => void;
    handleEliminarIntento: (id: number) => void;
}

export default function ResultadosModal({
    verResultados,
    setVerResultados,
    listaResultados,
    loadingResultados,
    handleExportarExcel,
    handleEliminarIntento
}: Props) {
    if (!verResultados) return null;

    return (
        <div className="fixed inset-0 z-105 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                {/* HEAD: Titulo y Exportación */}
                <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl">
                            <BarChart2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="font-extrabold text-xl text-gray-900 dark:text-white">Resultados del Examen</h3>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExportarExcel}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            <Download size={18} /> Exportar
                        </button>
                        <button
                            onClick={() => setVerResultados(false)}
                            className="text-gray-400 hover:text-rose-500 transition p-1 bg-white dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* BODY: Tabla de resultados */}
                <div className="p-0 overflow-y-auto flex-1">
                    {loadingResultados ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 dark:border-slate-800">
                                    <Skeleton className="h-10 w-24 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-8 w-12 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : listaResultados.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <BarChart2 size={32} className="text-gray-300 dark:text-slate-600" />
                            </div>
                            <p className="text-gray-500 dark:text-slate-400 font-medium">Aún no hay intentos registrados para este examen.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 uppercase text-[10px] font-extrabold tracking-widest sticky top-0 border-b border-gray-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Fecha / Hora</th>
                                    <th className="px-6 py-4">Datos del Trabajador</th>
                                    <th className="px-6 py-4 text-center">Nota</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 bg-white dark:bg-transparent">
                                {listaResultados.map((res) => (
                                    <tr key={res.id_intento} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-slate-300">
                                                    {new Date(res.fecha_intento).toLocaleDateString()}
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-400">
                                                    {new Date(res.fecha_intento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-gray-900 dark:text-slate-100 text-xs uppercase">
                                                    {res.nombre_completo || 'Sin nombre'}
                                                </span>
                                                <span className="font-mono text-[11px] text-blue-500 mt-0.5">
                                                    DNI: {res.dni_trabajador}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-inner ${res.nota >= 13
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                                                : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50'
                                                }`}>
                                                {res.nota}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEliminarIntento(res.id_intento)}
                                                className="text-gray-300 hover:text-rose-500 transition-colors p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                title="Eliminar intento"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-gray-500 dark:text-slate-400 text-sm font-medium bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700">
                        Total evaluados: <span className="text-blue-600 dark:text-blue-400 font-black ml-1">{listaResultados.length}</span>
                    </span>
                    <button
                        onClick={() => setVerResultados(false)}
                        className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-100 font-bold transition shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}