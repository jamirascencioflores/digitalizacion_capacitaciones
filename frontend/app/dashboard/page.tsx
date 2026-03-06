// frontend/app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    BarChart3,
    ShieldAlert,
    ChevronRight
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
    const router = useRouter();

    // ESTADOS DE DATOS
    const [stats, setStats] = useState<DashboardStats>({ totalCapacitaciones: 0, totalParticipantes: 0, promedioAsistencia: '0' });
    const [capacitaciones, setCapacitaciones] = useState<CapacitacionResumen[]>([]);
    const [distribution, setDistribution] = useState<DistributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // ESTADO PARA ALERTAS EN TIEMPO REAL
    const [alertasPendientes, setAlertasPendientes] = useState(0);

    const userRole = user?.rol?.trim().toLowerCase();

    // 1. EFECTO DE CARGA INICIAL (Datos pesados: Gráficos y Tablas)
    useEffect(() => {
        const fetchInitialData = async () => {
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
                console.error('Error cargando datos del dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        if (userRole) {
            fetchInitialData();
        }
    }, [userRole]);

    // 2. EFECTO DE POLLING (Sondeo de Alertas cada 30s)
    useEffect(() => {
        const verificarAlertas = async () => {
            if (userRole !== 'administrador') return;

            try {
                const res = await api.get('/usuarios/solicitudes');
                setAlertasPendientes(res.data.length);
            } catch (error) {
                console.error("Error verificando alertas en segundo plano", error);
            }
        };

        if (userRole === 'administrador') {
            // Ejecutar inmediatamente al entrar
            verificarAlertas();

            // Configurar intervalo de 30 segundos
            const intervalo = setInterval(verificarAlertas, 30000);

            // Limpieza al salir de la página (Detiene el reloj)
            return () => clearInterval(intervalo);
        }
    }, [userRole]);

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
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">Cargando sistema...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* --- ENCABEZADO --- */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 dark:from-slate-800 dark:to-slate-800/80 p-8 rounded-3xl border border-blue-100/50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-900 dark:text-blue-100 tracking-tight">
                        Bienvenido, {user?.nombre || 'Usuario'} 👋
                    </h1>
                    <p className="text-blue-600/70 dark:text-blue-400/80 text-sm mt-2 font-medium">
                        Resumen general del sistema de capacitaciones.
                    </p>
                </div>

                {userRole !== 'auditor' && (
                    <Link
                        href="/dashboard/capacitaciones/crear"
                        className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40 flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} className="transition-transform group-hover:rotate-90" />
                        Nueva Capacitación
                    </Link>
                )}
            </div>

            {/* BANNER DE ALERTAS AUTOMÁTICO (SOLO ADMIN) */}
            {userRole === 'administrador' && alertasPendientes > 0 && (
                <div className="bg-red-50 border border-red-100/50 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 shadow-md transition-all duration-500">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-xl text-red-500 shadow-sm animate-pulse border border-red-100">
                            <ShieldAlert size={26} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900 text-lg">Acción Requerida</h3>
                            <p className="text-red-700/80 text-sm">
                                Hay <span className="font-bold text-red-800">{alertasPendientes} usuario(s)</span> solicitando restablecer su contraseña.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/alertas"
                        className="whitespace-nowrap bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-500/20 flex items-center gap-2 hover:shadow-xl active:scale-95"
                    >
                        Atender Solicitudes <ChevronRight size={18} />
                    </Link>
                </div>
            )}

            {/* --- TARJETAS KPI --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-semibold tracking-wide uppercase">Capacitaciones Año</p>
                            <h3 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mt-2 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{stats.totalCapacitaciones}</h3>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><FileText size={24} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-semibold tracking-wide uppercase">Participantes Hist.</p>
                            <h3 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mt-2 tracking-tight group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">{stats.totalParticipantes}</h3>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-500 dark:text-amber-400 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><Users size={24} /></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-semibold tracking-wide uppercase">Promedio Asist.</p>
                            <h3 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 mt-2 tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{stats.promedioAsistencia}</h3>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-500 dark:text-emerald-400 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
                    </div>
                </div>

                {/* KPI COBERTURA */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-semibold tracking-wide uppercase">Cobertura Global</p>
                            <h3 className="text-4xl font-extrabold text-orange-500 dark:text-orange-400 mt-2 tracking-tight drop-shadow-sm">{stats.coberturaGlobal || "0%"}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                                {stats.personasUnicas || 0} de {stats.totalTrabajadores || 0} activos
                            </p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-500 dark:text-orange-400 rounded-2xl shadow-inner group-hover:scale-110 transition-transform"><BarChart3 size={24} /></div>
                    </div>
                    {/* Elemento decorativo */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-full blur-2xl opacity-60 group-hover:scale-150 transition-transform duration-700"></div>
                </div>
            </div>

            {/* --- GRÁFICO DE BARRAS POR ÁREA (SOLO INTERNAS) --- */}
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 rounded-xl">
                        <BarChart3 size={20} />
                    </div>
                    Avance de Capacitación
                </h2>

                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                    {distribution.filter(d => d.tipo === 'INTERNO').length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6 bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-600">No hay datos de áreas internas para mostrar.</p>
                    ) : (
                        distribution
                            .filter(item => item.tipo === 'INTERNO')
                            .map((item, idx) => (
                                <div key={idx} className="flex items-center text-sm group hover:bg-gray-50/80 dark:hover:bg-slate-700/50 p-2 -mx-2 rounded-2xl transition-colors duration-300">
                                    <div className="w-32 md:w-48 font-semibold text-gray-600 dark:text-gray-300 truncate transition-colors group-hover:text-blue-700 dark:group-hover:text-blue-400" title={item.area}>
                                        {item.area}
                                    </div>
                                    <div className="flex-1 mx-4">
                                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 border border-gray-200/50 dark:border-slate-600/50 relative overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${getColorBarra(item.avance)}`}
                                                style={{ width: `${item.avance}%` }}
                                            >
                                                {/* Efecto de brillo en la barra */}
                                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12 transform -translate-x-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-12 text-right font-bold text-gray-700 dark:text-gray-200">
                                        {item.avance}%
                                    </div>
                                    <div className="w-24 text-right text-xs font-medium text-gray-400 dark:text-gray-500 hidden sm:block">
                                        ({item.capacitados}/{item.total})
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* --- LISTA RECIENTE (TABLA) --- */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-slate-900/40 border border-gray-100/60 dark:border-slate-700 overflow-hidden transition-all duration-300">

                <div className="p-6 md:p-8 border-b border-gray-100/60 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30 dark:bg-slate-800/30">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        Últimas Capacitaciones
                    </h3>
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Tema, Expositor o Sede..."
                            className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto bg-gray-50/20 dark:bg-slate-800/20">
                    {capacitaciones.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 p-6 rounded-full mb-4 shadow-inner">
                                <Inbox size={48} className="text-gray-300 dark:text-gray-600 drop-shadow-sm" />
                            </div>
                            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">Aún no hay capacitaciones</p>
                            <p className="text-sm font-medium mt-1">Registra la primera para verla aquí.</p>
                        </div>
                    ) : capacitacionesFiltradas.length > 0 ? (
                        <>
                            {/* --- VISTA MÓVIL (TARJETAS) --- */}
                            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                                {capacitacionesFiltradas.map((cap) => (
                                    <div key={cap.id_capacitacion} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">

                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-1">{new Date(cap.fecha).toLocaleDateString('es-PE')}</span>
                                                <h4 className="font-extrabold text-blue-900 dark:text-blue-100 text-base leading-tight">
                                                    {cap.tema_principal}
                                                </h4>
                                            </div>
                                            <span className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-xl font-bold text-xs border border-gray-100 dark:border-slate-600 whitespace-nowrap">
                                                <Users size={12} className="inline mr-1 opacity-50" />
                                                {cap.total_asistentes}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-50 dark:border-slate-700/50 pt-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                <UserCheck size={16} className="text-blue-400 flex-shrink-0" />
                                                <span className="truncate">{cap.expositor_nombre}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                <MapPin size={16} className={cap.sede_empresa === 'Olmos' ? 'text-orange-400 flex-shrink-0' : 'text-green-400 flex-shrink-0'} />
                                                <span className="truncate">{cap.sede_empresa}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                                                <FileText size={16} className="flex-shrink-0 opacity-60" />
                                                <span className="text-xs">Acta: {cap.codigo_acta}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => router.push(`/dashboard/capacitaciones/${cap.id_capacitacion}`)}
                                            className={`mt-2 w-full font-bold text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 py-3 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${userRole === 'auditor'
                                                ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-gray-800 dark:hover:text-gray-200'
                                                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white hover:border-blue-500 dark:hover:border-blue-500'
                                                }`}
                                        >
                                            {userRole === 'auditor' ? 'Ver Detalles Completos' : 'Gestionar Capacitación'}
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* --- VISTA ESCRITORIO (TABLA TRADICIONAL) --- */}
                            <table className="w-full text-sm text-left hidden md:table">
                                <thead className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Fecha</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Tema Principal</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Expositor</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Sede</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Asistentes</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl whitespace-nowrap">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/60 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                                    {capacitacionesFiltradas.map((cap) => (
                                        <tr key={cap.id_capacitacion} className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors group relative z-0 hover:z-10">
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium">
                                                {new Date(cap.fecha).toLocaleDateString('es-PE')}
                                                <div className="text-xs text-gray-400 dark:text-gray-500 font-normal mt-1">{cap.codigo_acta}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
                                                <div className="max-w-[300px] truncate" title={cap.tema_principal}>{cap.tema_principal}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <UserCheck size={16} className="text-blue-400 flex-shrink-0" />
                                                    <span className="max-w-[150px] truncate" title={cap.expositor_nombre}>{cap.expositor_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${cap.sede_empresa === 'Olmos' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-800/50'}`}>
                                                    <MapPin size={12} />
                                                    {cap.sede_empresa}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl font-bold text-xs ring-1 ring-gray-200 dark:ring-slate-600 shadow-sm">{cap.total_asistentes}</span>
                                            </td>

                                            <td className="px-6 py-5 text-right flex justify-end">
                                                <button
                                                    onClick={() => router.push(`/dashboard/capacitaciones/${cap.id_capacitacion}`)}
                                                    className={`font-semibold text-xs border px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap ${userRole === 'auditor'
                                                        ? 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-gray-200'
                                                        : 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-800 dark:hover:text-blue-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'
                                                        }`}
                                                >
                                                    {userRole === 'auditor' ? 'Ver Detalles' : 'Gestionar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/30 dark:bg-slate-800/30">
                            <p className="font-medium text-lg">No se encontraron resultados para:</p>
                            <p className="mt-1 font-bold text-blue-600 dark:text-blue-400 break-words">&quot;{busqueda}&quot;</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Función auxiliar para colorear las barras según porcentaje
function getColorBarra(avance: number) {
    if (avance < 30) return "bg-gradient-to-r from-red-400 to-red-500";
    if (avance < 70) return "bg-gradient-to-r from-amber-400 to-amber-500";
    return "bg-gradient-to-r from-blue-400 to-blue-500";
}