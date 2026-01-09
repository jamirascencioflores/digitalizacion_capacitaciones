'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
    ArrowLeft, FileSpreadsheet, AlertCircle, ChevronDown, BarChart3, Filter
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// --- INTERFACES ---
interface Worker {
    dni: string;
    apellidos: string;
    nombres: string;
    cargo: string;
}

interface AvanceReporte {
    id_plan: number;
    tema: string;
    objetivo: string;
    area: string;
    mes: string;
    meta_total: number;
    avance_real: number;
    porcentaje: number;
    faltantes: Worker[];
    tipo?: string; // Para identificar EXTERNO/INTERNO
}

// Interfaz para el gráfico resumen
interface ChartData {
    name: string;      // Será el Nombre del Área o del Tema
    meta: number;
    real: number;
    porcentaje: number;
    tipo: 'INTERNO' | 'EXTERNO';
    esResumen: boolean; // Para saber si estamos viendo Áreas o Temas
}

export default function GestionPage() {
    const router = useRouter();
    const [stats, setStats] = useState<AvanceReporte[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [selectedArea, setSelectedArea] = useState<string>('Todos');

    // Subida
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Contexto de carga
    const loadStats = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/gestion/avance');
            setStats(data);
        } catch (error) {
            console.error("Error cargando reporte:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    // --- 1. OBTENER LISTA DE ÁREAS ÚNICAS ---
    const uniqueAreas = useMemo(() => {
        const areasSet = new Set<string>();
        stats.forEach(s => {
            if (s.area) {
                s.area.split(',').map(a => a.trim()).forEach(parte => {
                    if (parte) areasSet.add(parte);
                });
            }
        });
        return ['Todos', ...Array.from(areasSet).sort()];
    }, [stats]);

    // --- 2. FILTRAR LA LISTA DE TARJETAS (ABAJO) ---
    const filteredStats = useMemo(() => {
        if (selectedArea === 'Todos') return stats;
        return stats.filter(s => {
            if (!s.area) return false;
            const areasDelRegistro = s.area.split(',').map(a => a.trim());
            return areasDelRegistro.includes(selectedArea);
        });
    }, [stats, selectedArea]);

    // --- 3. LÓGICA INTELIGENTE DEL GRÁFICO (ARRIBA) ---
    const chartData = useMemo<ChartData[]>(() => {

        // CASO A: VISTA GENERAL (RESUMEN POR ÁREA)
        if (selectedArea === 'Todos') {
            const areaMap = new Map<string, { meta: number; real: number }>();

            stats.forEach(plan => {
                const areas = plan.area.split(',').map(a => a.trim());
                areas.forEach(areaNombre => {
                    if (!areaNombre) return;
                    if (!areaMap.has(areaNombre)) {
                        areaMap.set(areaNombre, { meta: 0, real: 0 });
                    }
                    const actual = areaMap.get(areaNombre)!;
                    actual.meta += plan.meta_total;
                    actual.real += plan.avance_real;
                });
            });

            return Array.from(areaMap.entries()).map(([nombre, data]) => {
                const esExterno = data.meta === 0;
                let pct = 0;

                if (esExterno) {
                    pct = data.real > 0 ? 100 : 0;
                } else {
                    pct = data.meta > 0 ? (data.real / data.meta) * 100 : 0;
                }

                return {
                    name: nombre,
                    meta: data.meta,
                    real: data.real,
                    porcentaje: Number(pct.toFixed(1)),
                    // CORRECCIÓN 1: Casteo explícito
                    tipo: (esExterno ? 'EXTERNO' : 'INTERNO') as 'INTERNO' | 'EXTERNO',
                    esResumen: true
                };
            }).sort((a, b) => {
                if (a.tipo === b.tipo) return a.porcentaje - b.porcentaje;
                return a.tipo === 'INTERNO' ? -1 : 1;
            });
        }

        // CASO B: VISTA DETALLADA (TEMAS DEL ÁREA)
        else {
            return filteredStats.map(plan => {
                const esExterno = plan.meta_total === 0;
                return {
                    name: plan.tema.substring(0, 40) + (plan.tema.length > 40 ? '...' : ''),
                    meta: plan.meta_total,
                    real: plan.avance_real,
                    porcentaje: plan.porcentaje,
                    // CORRECCIÓN 2: Casteo explícito
                    tipo: (esExterno ? 'EXTERNO' : 'INTERNO') as 'INTERNO' | 'EXTERNO',
                    esResumen: false
                };
            });
        }
    }, [stats, filteredStats, selectedArea]);

    // Altura dinámica: Si es resumen son menos barras, si es detalle son más
    const chartHeight = Math.max(400, chartData.length * (selectedArea === 'Todos' ? 40 : 60));

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return alert("Selecciona un archivo");
        const formData = new FormData();
        formData.append('file', file);
        try {
            setUploading(true);
            await api.post('/gestion/plan', formData);
            alert("¡Plan cargado!");
            setFile(null);
            setShowUpload(false);
            loadStats();
        } catch (error) {
            console.error(error);
            alert("Error al subir.");
        } finally {
            setUploading(false);
        }
    };

    const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

    if (loading) return <div className="p-10 text-center">Cargando Gestión...</div>;

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-6">

            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <ArrowLeft className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Cumplimiento</h1>
                        <p className="text-sm text-gray-500">Plan Anual vs. Ejecución Real</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition"
                >
                    <FileSpreadsheet size={16} />
                    {showUpload ? 'Ocultar' : 'Importar Plan'}
                </button>
            </div>

            {/* ZONA DE CARGA */}
            {showUpload && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 animate-fadeIn">
                    <form onSubmit={handleUpload} className="flex gap-4 items-center">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-blue-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        />
                        <button type="submit" disabled={!file || uploading} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow hover:bg-green-700">
                            {uploading ? '...' : 'Procesar'}
                        </button>
                    </form>
                </div>
            )}

            {/* FILTROS Y ESTADÍSTICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Filter size={16} /> Filtrar Vista:
                        </label>
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {uniqueAreas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>

                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    {selectedArea === 'Todos' ? 'Áreas Monitoreadas:' : 'Temas a cumplir:'}
                                </span>
                                <span className="font-bold">{chartData.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: GRÁFICO INTELIGENTE */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="text-blue-600" />
                        <h3 className="font-bold text-gray-800">
                            {selectedArea === 'Todos' ? 'Resumen General por Áreas' : `Detalle de Temas: ${selectedArea}`}
                        </h3>
                    </div>

                    <div className="w-full overflow-y-auto max-h-[500px] pr-2">
                        <div style={{ height: `${chartHeight}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={160}
                                        tick={({ x, y, payload }) => {
                                            // Buscamos el dato correspondiente para saber su tipo
                                            const item = chartData.find(d => d.name === payload.value);
                                            const isExternal = item?.tipo === 'EXTERNO';
                                            return (
                                                <text x={x - 10} y={y + 4} textAnchor="end" fill={isExternal ? "#2563eb" : "#374151"} fontSize={11} fontWeight={isExternal ? "bold" : "normal"}>
                                                    {payload.value.substring(0, 25)}{payload.value.length > 25 ? '...' : ''}
                                                </text>
                                            );
                                        }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        cursor={{ fill: '#f9fafb' }}
                                        // CORRECCIÓN: Agregamos '?' a payload para hacerlo opcional, igual que en la librería
                                        formatter={(
                                            value: number | string | undefined,
                                            name: number | string | undefined,
                                            item: { payload?: ChartData }
                                        ) => {
                                            const val = value ?? 0;
                                            // Usamos ?. para acceder de forma segura por si payload es undefined
                                            const esExterno = item.payload?.tipo === 'EXTERNO';

                                            if (name === 'real') return [`${val} capacitados`, 'Avance Real'];
                                            if (name === 'meta') {
                                                if (esExterno) return ["N/A", "Meta (Contratista)"];
                                                return [`${val} trabajadores`, 'Meta Acumulada'];
                                            }
                                            return [val, String(name)];
                                        }}
                                        labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />

                                    <Bar dataKey="meta" name="meta" stackId="a" fill="#f3f4f6" radius={[0, 4, 4, 0]} barSize={20} />

                                    <Bar dataKey="real" name="real" stackId="b" radius={[0, 4, 4, 0]} barSize={20}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.tipo === 'EXTERNO' ? '#3b82f6' : '#22c55e'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTA DETALLADA (ABAJO) - SIEMPRE MUESTRA LOS TEMAS FILTRADOS */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-800 text-lg mt-8">
                    {selectedArea === 'Todos' ? 'Listado Completo de Actividades' : `Actividades para: ${selectedArea}`}
                </h3>

                {filteredStats.map((item) => (
                    <div key={item.id_plan} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {item.area.split(',').map((a, i) => (
                                        <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border 
                                            ${a.trim() === selectedArea
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {a.trim()}
                                        </span>
                                    ))}
                                    <span className="text-xs text-gray-400 font-medium ml-2">{item.mes}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-lg">{item.tema}</h4>
                                <p className="text-xs text-gray-500 italic mb-2">{item.objetivo}</p>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 max-w-md">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-500 ${item.meta_total === 0 ? 'bg-blue-500' : // AZUL si es Externo
                                                item.porcentaje >= 100 ? 'bg-green-500' :
                                                    item.porcentaje >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${item.meta_total === 0 && item.avance_real > 0 ? 100 : Math.min(item.porcentaje, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 w-12 text-right">
                                        {item.meta_total === 0 ? (item.avance_real > 0 ? 'OK' : '-') : item.porcentaje + '%'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 border-l border-gray-100 pl-6">
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Estado</p>

                                    {item.meta_total === 0 ? (
                                        // ETIQUETA AZUL PARA CONTRATISTAS
                                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-100">
                                            <span className="text-sm font-bold">Contratista</span>
                                        </div>
                                    ) : item.faltantes.length > 0 ? (
                                        <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-md border border-red-100">
                                            <AlertCircle size={14} />
                                            <span className="text-sm font-bold">Faltan {item.faltantes.length}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-md border border-green-100">
                                            {/* Importar CheckCircle2 arriba si falta */}
                                            <span className="text-sm font-bold">Completado</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => toggleExpand(item.id_plan)}
                                    disabled={item.faltantes.length === 0}
                                    className={`p-2 rounded-full border transition ${item.faltantes.length === 0 ? 'opacity-30 cursor-not-allowed' :
                                        expandedId === item.id_plan ? 'bg-gray-100 rotate-180' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <ChevronDown size={20} className="text-gray-600" />
                                </button>
                            </div>
                        </div>

                        {expandedId === item.id_plan && item.faltantes.length > 0 && (
                            <div className="border-t border-gray-100 bg-gray-50 p-5 animate-fadeIn">
                                <h5 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                                    <AlertCircle size={16} /> Personal Pendiente ({item.faltantes.length}):
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {item.faltantes.map((worker) => (
                                        <div key={worker.dni} className="bg-white p-2 rounded border border-gray-200 shadow-sm flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">
                                                {worker.nombres.charAt(0)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-gray-700 truncate">{worker.apellidos}, {worker.nombres}</p>
                                                <p className="text-[10px] text-gray-500">{worker.cargo}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}