'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // <--- 1. Importamos useRouter
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
    FileText,
    Users,
    Calendar,
    Plus,
    Search,
    MapPin,
    UserCheck,
    Inbox,
    BarChart3
} from 'lucide-react';

interface CapacitacionResumen {
    id_capacitacion: number;
    fecha: string;
    tema_principal: string;
    expositor_nombre: string;
    total_asistentes: number;
    sede_empresa: string;
    codigo_acta: string;
}

interface DashboardStats {
    totalCapacitaciones: number;
    totalParticipantes: number;
    promedioAsistencia: string;
    coberturaGlobal?: string;
    personasUnicas?: number;
    totalTrabajadores?: number;
}

interface DistributionItem {
    area: string;
    total: number;
    capacitados: number;
    avance: number;
    tipo?: string;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter(); // <--- 2. Instanciamos el router

    // ESTADOS
    const [stats, setStats] = useState<DashboardStats>({ totalCapacitaciones: 0, totalParticipantes: 0, promedioAsistencia: '0' });
    const [capacitaciones, setCapacitaciones] = useState<CapacitacionResumen[]>([]);
    const [distribution, setDistribution] = useState<DistributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const userRole = user?.rol?.trim().toLowerCase();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resStats, resCaps, resDist] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/recent'),
                    api.get('/dashboard/distribution')
                ]);

                setStats(resStats.data);
                setCapacitaciones(resCaps.data);
                setDistribution(resDist.data);
            } catch (error) {
                console.error('Error cargando dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // FILTRO DE BÚSQUEDA
    const capacitacionesFiltradas = capacitaciones.filter((c) => {
        const texto = busqueda.toLowerCase();
        return (
            c.tema_principal.toLowerCase().includes(texto) ||
            c.expositor_nombre.toLowerCase().includes(texto) ||
            c.sede_empresa.toLowerCase().includes(texto) ||
            c.codigo_acta.toLowerCase().includes(texto)
        );
    });

    if (authLoading || loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando sistema...</div>;
    }

    return (
        <div className="space-y-8">

            {/* --- ENCABEZADO --- */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-green-900">
                        Bienvenido, {user?.nombre || 'Usuario'} 👋
                    </h1>
                    <p className="text-green-600/80 text-sm mt-1">
                        Resumen general del sistema de capacitaciones.
                    </p>
                </div>

                {userRole !== 'auditor' && (
                    <Link
                        href="/dashboard/capacitaciones/crear"
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md flex items-center gap-2 transition transform hover:scale-105"
                    >
                        <Plus size={20} />
                        Nueva Capacitación
                    </Link>
                )}
            </div>

            {/* --- TARJETAS KPI --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Capacitaciones Año</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalCapacitaciones}</h3>                        </div>
                        <div className="p-2 bg-blue-50 text-green-600 rounded-lg"><FileText size={20} /></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Participantes Hist.</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalParticipantes}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-green-600 rounded-lg"><Users size={20} /></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Promedio Asist.</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.promedioAsistencia}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-green-600 rounded-lg"><Calendar size={20} /></div>
                    </div>
                </div>

                {/* KPI COBERTURA */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Cobertura Global</p>
                            <h3 className="text-3xl font-bold text-orange-500 mt-2">{stats.coberturaGlobal || "0%"}</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {stats.personasUnicas || 0} de {stats.totalTrabajadores || 0} activos
                            </p>
                        </div>
                        <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><BarChart3 size={20} /></div>
                    </div>
                </div>
            </div>

            {/* --- GRÁFICO DE BARRAS POR ÁREA (SOLO INTERNAS) --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-gray-400" />
                    Avance de Capacitación
                </h2>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {distribution.filter(d => d.tipo === 'INTERNO').length === 0 ? (
                        <p className="text-gray-400 text-sm">No hay datos de áreas internas para mostrar.</p>
                    ) : (
                        distribution
                            .filter(item => item.tipo === 'INTERNO')
                            .map((item, idx) => (
                                <div key={idx} className="flex items-center text-sm group hover:bg-gray-50 p-1 rounded transition">
                                    <div className="w-32 md:w-48 font-medium text-gray-600 truncate" title={item.area}>
                                        {item.area}
                                    </div>
                                    <div className="flex-1 mx-3">
                                        <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-1000 ${getColorBarra(item.avance)}`}
                                                style={{ width: `${item.avance}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="w-12 text-right font-bold text-gray-700">
                                        {item.avance}%
                                    </div>
                                    <div className="w-24 text-right text-xs text-gray-400 hidden sm:block">
                                        ({item.capacitados}/{item.total})
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* --- LISTA RECIENTE (TABLA) --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800">Últimas Capacitaciones</h3>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Tema, Expositor o Sede..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {capacitaciones.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                <Inbox size={40} className="text-gray-300" />
                            </div>
                            <p className="text-lg font-medium text-gray-600">Aún no hay capacitaciones</p>
                            <p className="text-sm">Registra la primera para verla aquí.</p>
                        </div>
                    ) : capacitacionesFiltradas.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Tema Principal</th>
                                    <th className="px-6 py-3">Expositor</th>
                                    <th className="px-6 py-3">Sede</th>
                                    <th className="px-6 py-3 text-center">Asistentes</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {capacitacionesFiltradas.map((cap) => (
                                    <tr key={cap.id_capacitacion} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                            {new Date(cap.fecha).toLocaleDateString('es-PE')}
                                            <div className="text-xs text-gray-400 font-normal">{cap.codigo_acta}</div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-800">{cap.tema_principal}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <UserCheck size={16} className="text-blue-400" />
                                                {cap.expositor_nombre}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cap.sede_empresa === 'Olmos' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                <MapPin size={12} />
                                                {cap.sede_empresa}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-bold text-xs">{cap.total_asistentes}</span>
                                        </td>

                                        {/* --- CAMBIO PRINCIPAL AQUÍ: BOTÓN DE ACCIÓN --- */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => router.push(`/dashboard/capacitaciones/${cap.id_capacitacion}`)}
                                                className={`font-medium text-xs border px-3 py-1.5 rounded transition ${userRole === 'auditor'
                                                    ? 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-800'
                                                    }`}
                                            >
                                                {userRole === 'auditor' ? 'Ver Detalles' : 'Gestionar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 text-center text-gray-500">
                            <p>No se encontraron resultados para: <strong>&quot;{busqueda}&quot;</strong></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Función auxiliar para colorear las barras según porcentaje
function getColorBarra(avance: number) {
    if (avance < 30) return "bg-red-500";
    if (avance < 70) return "bg-yellow-400";
    return "bg-green-500";
}