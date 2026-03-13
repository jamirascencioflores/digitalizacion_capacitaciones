'use client';

import {
    X,
    BarChart2,
    Download,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-200">

                {/* HEAD: Titulo y Exportación */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                            <BarChart2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Resultados del Examen</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportarExcel}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-200 dark:shadow-none"
                        >
                            <Download size={16} /> Exportar Excel
                        </button>
                        <button
                            onClick={() => setVerResultados(false)}
                            className="text-slate-400 hover:text-rose-500 transition p-1"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* BODY: Tabla de resultados */}
                <div className="p-0 overflow-y-auto flex-1">
                    {loadingResultados ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 dark:border-slate-800">
                                    <Skeleton className="h-10 w-24 rounded-lg" />
                                    <div className="flex-1 space-y-2 text-left">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-8 w-12 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : listaResultados.length === 0 ? (
                        <div className="p-20 text-center">
                            <p className="text-slate-500 dark:text-slate-400 text-sm italic">Aún no hay intentos registrados.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Fecha / Hora</th>
                                    <th className="px-6 py-4">Datos del Trabajador</th>
                                    <th className="px-6 py-4 text-center">Nota</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {listaResultados.map((res) => (
                                    <tr key={res.id_intento} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {new Date(res.fecha_intento).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(res.fecha_intento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs">
                                                    {res.nombre_completo || 'Sin nombre'}
                                                </span>
                                                <span className="font-mono text-[10px] text-blue-500">
                                                    DNI: {res.dni_trabajador}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${res.nota >= 13
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                                                }`}>
                                                {res.nota}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEliminarIntento(res.id_intento)}
                                                className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                title="Eliminar intento"
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

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Total evaluados: <span className="text-blue-600 dark:text-blue-400 font-bold">{listaResultados.length}</span>
                    </span>
                    <button
                        onClick={() => setVerResultados(false)}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 font-bold transition shadow-sm"
                    >
                        Cerrar Ventana
                    </button>
                </div>
            </div>
        </div>
    );
}
