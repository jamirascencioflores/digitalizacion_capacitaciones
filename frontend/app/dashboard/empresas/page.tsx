// frontend/app/dashboard/empresas/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
    Building2, Search, Plus, Users, FileText, ShieldAlert, ChevronRight, ArrowUpDown, X
} from 'lucide-react';

export default function EmpresasPage() {
    const router = useRouter();
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    // 🟢 Estados para el Modal
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nuevaEmpresa, setNuevaEmpresa] = useState({
        nombre: '',
        ruc: '',
        direccion_principal: '',
        actividad_economica: '',
        codigo_formato: 'FOR-SST-01',
        revision_actual: '00'
    });

    // 🟢 ESTADO PARA LAS SEDES DINÁMICAS
    const [sedesExtra, setSedesExtra] = useState<string[]>([]);

    // --- FUNCIONES DE INICIALIZACIÓN (Faltaban estas) ---
    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        try {
            const { data } = await api.get('/dashboard/saas/empresas');
            setEmpresas(data);
        } catch (error) {
            console.error("Error al cargar empresas:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEstado = async (id: number, estadoActual: boolean) => {
        if (!confirm("¿Seguro que desea cambiar el estado de acceso de esta empresa?")) return;
        try {
            await api.patch(`/dashboard/saas/empresas/${id}/toggle`, { estado: !estadoActual });
            setEmpresas(prev => prev.map(e => e.id_empresa === id ? { ...e, estado: !estadoActual } : e));
        } catch (error) {
            alert("Error al actualizar estado");
        }
    };

    const agregarSede = () => setSedesExtra([...sedesExtra, ""]);
    const actualizarSede = (index: number, valor: string) => {
        const nuevasSedes = [...sedesExtra];
        nuevasSedes[index] = valor;
        setSedesExtra(nuevasSedes);
    };
    const eliminarSede = (index: number) => {
        setSedesExtra(sedesExtra.filter((_, i) => i !== index));
    };

    const handleCrearEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Enviamos las sedes filtrando las que estén vacías
            const payload = {
                ...nuevaEmpresa,
                sedes_adicionales: sedesExtra.filter(s => s.trim() !== '')
            };

            // Apunta a la ruta de empresas que creamos
            await api.post('/empresa', payload);
            setShowModal(false);
            setNuevaEmpresa({ nombre: '', ruc: '', direccion_principal: '', actividad_economica: '', codigo_formato: 'FOR-SST-01', revision_actual: '00' });
            setSedesExtra([]);
            fetchEmpresas();
            alert("✅ Empresa registrada con éxito");
        } catch (error: any) {
            alert(error.response?.data?.error || "Error al registrar la empresa");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtradas = empresas.filter(e =>
        e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.ruc.includes(busqueda)
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando empresas clientes...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Building2 className="text-blue-500" /> Directorio de Clientes
                    </h1>
                    <p className="text-sm text-gray-500">Administración de acceso y métricas por empresa.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={20} /> Registrar Nueva Empresa
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white dark:bg-[#0B1121] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o RUC..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors border border-transparent hover:border-gray-200">
                    <ArrowUpDown size={16} /> Ordenar
                </button>
            </div>

            {/* Tabla de Empresas */}
            <div className="bg-white dark:bg-[#0B1121] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-[11px] uppercase tracking-[0.15em] font-black">
                        <tr>
                            <th className="px-6 py-4">Empresa / RUC</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-center">Usuarios</th>
                            <th className="px-6 py-4 text-center">Actas</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filtradas.map((emp) => (
                            <tr key={emp.id_empresa} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 transition-colors">
                                            {emp.nombre}
                                        </span>
                                        <span className="text-xs text-gray-400">RUC: {emp.ruc}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${emp.estado ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                        }`}>
                                        {emp.estado ? 'Activo' : 'Suspendido'}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                                            <Users size={14} className="text-gray-400" />
                                            {emp.admins + emp.auditores + emp.supervisores}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center font-bold text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center justify-center gap-1">
                                        <FileText size={14} />
                                        {emp.total_capacitaciones}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleToggleEstado(emp.id_empresa, emp.estado)} className={`p-2 rounded-lg transition-all ${emp.estado ? 'text-red-400 hover:bg-red-50' : 'text-green-400 hover:bg-green-50'}`} title={emp.estado ? "Suspender acceso" : "Activar acceso"}>
                                            <ShieldAlert size={18} />
                                        </button>
                                        <button onClick={() => router.push(`/dashboard/empresas/${emp.id_empresa}`)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Gestionar">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 🟢 MODAL NUEVA EMPRESA */}
            {showModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                <Building2 className="text-blue-500" /> Registrar Cliente
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCrearEmpresa} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Razón Social</label>
                                    <input required type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={nuevaEmpresa.nombre} onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, nombre: e.target.value })} placeholder="Ej: Agrícola San Juan S.A.C." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">RUC</label>
                                    <input required type="text" maxLength={11} pattern="\d{11}" title="Debe contener 11 dígitos numéricos" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none" value={nuevaEmpresa.ruc} onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, ruc: e.target.value })} placeholder="20123456789" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Actividad Económica</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        value={nuevaEmpresa.actividad_economica}
                                        onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, actividad_economica: e.target.value })}
                                        placeholder="Ej: Principal - 0150" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dirección Principal (Sede legal)</label>
                                    <input required type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none" value={nuevaEmpresa.direccion_principal} onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, direccion_principal: e.target.value })} placeholder="Av. Principal 123, Distrito, Ciudad" />
                                </div>

                                {/* 🟢 DIRECCIONES DINÁMICAS */}
                                <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Sedes Adicionales</label>
                                        <button
                                            type="button"
                                            onClick={agregarSede}
                                            className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                        >
                                            <Plus size={14} /> Añadir Sede
                                        </button>
                                    </div>

                                    {sedesExtra.length === 0 && (
                                        <p className="text-sm text-gray-400 italic">No hay sedes adicionales. Clic en el botón para añadir.</p>
                                    )}

                                    <div className="space-y-3">
                                        {sedesExtra.map((sede, index) => (
                                            <div key={index} className="flex gap-2 animate-in slide-in-from-top-2">
                                                <input
                                                    type="text"
                                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                                                    value={sede}
                                                    onChange={(e) => actualizarSede(index, e.target.value)}
                                                    placeholder={`Ej: Planta Olmos Lote ${index + 1}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarSede(index)}
                                                    className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                                                    title="Eliminar sede"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cód. Formato Actas</label>
                                    <input type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none uppercase" value={nuevaEmpresa.codigo_formato} onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, codigo_formato: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Revisión Actual</label>
                                    <input type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none" value={nuevaEmpresa.revision_actual} onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, revision_actual: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center">
                                    {isSubmitting ? "Guardando..." : "Guardar Cliente"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}