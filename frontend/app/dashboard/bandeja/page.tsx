'use client';

import React, { useState, useEffect } from 'react';
import {
    Inbox, Mail, Building2, Clock, CheckCircle2, AlertCircle, Loader2, Search, Phone, MessageCircle, Eye, X, MessageSquare
} from 'lucide-react';
import api from '@/services/api';
import { AxiosError } from 'axios';

interface Solicitud {
    id_solicitud: number;
    nombre: string;
    empresa: string;
    email: string;
    telefono: string;
    mensaje: string;
    fecha_envio: string;
    estado: string;
}

export default function BandejaPage() {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [toast, setToast] = useState<{ tipo: 'exito' | 'error', mensaje: string } | null>(null);
    const [tabActivo, setTabActivo] = useState<'Pendiente' | 'Atendido'>('Pendiente');

    // 🟢 NUEVO ESTADO: Para controlar qué mensaje se muestra en la ventana flotante
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);

    const fetchSolicitudes = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/contacto');
            setSolicitudes(response.data);
        } catch (error) {
            mostrarToast('error', 'No se pudieron cargar los mensajes.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchSolicitudes(); }, []);

    const marcarComoAtendido = async (id: number) => {
        try {
            await api.put(`/contacto/${id}/estado`, { estado: 'Atendido' });
            mostrarToast('exito', 'El cliente fue movido a la pestaña de Atendidos.');
            setSolicitudes(solicitudes.map(s => s.id_solicitud === id ? { ...s, estado: 'Atendido' } : s));
        } catch (error) {
            const err = error as AxiosError<{ error: string }>;
            mostrarToast('error', err.response?.data?.error || 'Error al actualizar.');
        }
    };

    const mostrarToast = (tipo: 'exito' | 'error', mensaje: string) => {
        setToast({ tipo, mensaje });
        setTimeout(() => setToast(null), 4000);
    };

    const abrirWhatsApp = (telefono: string, nombre: string) => {
        const numeroLimpio = telefono.replace(/[^\d+]/g, '');
        const mensaje = encodeURIComponent(`Hola ${nombre}, me comunico de FORMAPP en respuesta a tu solicitud en nuestra web...`);
        window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
    };

    const datosFiltrados = solicitudes
        .filter(s => s.estado === tabActivo)
        .filter(s =>
            s.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
            s.empresa.toLowerCase().includes(filtroTexto.toLowerCase()) ||
            s.email.toLowerCase().includes(filtroTexto.toLowerCase())
        );

    const pendientesCount = solicitudes.filter(s => s.estado === 'Pendiente').length;
    const atendidosCount = solicitudes.filter(s => s.estado === 'Atendido').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {/* ENCABEZADO Y TABS MANTENIDOS IGUAL */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Inbox size={28} />
                        </div>
                        Bandeja de Solicitudes
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-2 text-sm">Gestiona prospectos y comunícate vía WhatsApp.</p>
                </div>

                {toast && (
                    <div className={`px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg border animate-in slide-in-from-right-8 ${toast.tipo === 'exito' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400'
                            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400'
                        }`}>
                        {toast.tipo === 'exito' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span className="text-sm font-semibold">{toast.mensaje}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 border-b border-slate-200 dark:border-gray-800">
                <button
                    onClick={() => setTabActivo('Pendiente')}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all relative ${tabActivo === 'Pendiente' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                    <Clock size={18} /> Solicitudes Nuevas
                    <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 py-0.5 px-2.5 rounded-full text-xs">{pendientesCount}</span>
                    {tabActivo === 'Pendiente' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setTabActivo('Atendido')}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all relative ${tabActivo === 'Atendido' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                    <CheckCircle2 size={18} /> Clientes Atendidos
                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 py-0.5 px-2.5 rounded-full text-xs">{atendidosCount}</span>
                    {tabActivo === 'Atendido' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                </button>
            </div>

            {/* TABLA DE DATOS */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, empresa o correo..."
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-sm transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
                            <p className="font-medium">Cargando datos...</p>
                        </div>
                    ) : datosFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-slate-400 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                {tabActivo === 'Pendiente' ? <Inbox size={32} className="text-slate-300 dark:text-gray-600" /> : <CheckCircle2 size={32} className="text-emerald-300 dark:text-emerald-900/50" />}
                            </div>
                            <p className="font-bold text-lg text-slate-600 dark:text-gray-300">{tabActivo === 'Pendiente' ? 'No hay solicitudes nuevas' : 'No hay clientes atendidos'}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-gray-900/80 text-slate-500 dark:text-gray-400 uppercase font-semibold text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Contacto Principal</th>
                                    <th className="px-6 py-4">Mensaje</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-300">
                                {datosFiltrados.map((solicitud) => (
                                    <tr key={solicitud.id_solicitud} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${tabActivo === 'Pendiente' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                    {solicitud.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{solicitud.nombre}</p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1"><Building2 size={12} /> {solicitud.empresa}</span>
                                                        <a href={`mailto:${solicitud.email}`} className="flex items-center gap-1 hover:text-blue-500"><Mail size={12} /> {solicitud.email}</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 🟢 CELDA DEL MENSAJE CLICKABLE */}
                                        <td
                                            className="px-6 py-4 max-w-[200px] cursor-pointer group/msg"
                                            onClick={() => setSolicitudSeleccionada(solicitud)}
                                            title="Clic para leer completo"
                                        >
                                            <div className="flex items-center gap-2">
                                                <p className="truncate font-medium text-slate-600 dark:text-gray-400 group-hover/msg:text-blue-600 dark:group-hover/msg:text-blue-400 transition-colors">
                                                    {solicitud.mensaje}
                                                </p>
                                                <Eye size={16} className="opacity-0 group-hover/msg:opacity-100 text-blue-500 transition-opacity flex-shrink-0" />
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(solicitud.fecha_envio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => abrirWhatsApp(solicitud.telefono, solicitud.nombre)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 rounded-lg transition-colors"
                                                >
                                                    <MessageCircle size={14} /> WhatsApp
                                                </button>
                                                {tabActivo === 'Pendiente' && (
                                                    <button
                                                        onClick={() => marcarComoAtendido(solicitud.id_solicitud)}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 dark:bg-slate-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
                                                    >
                                                        Finalizar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 🟢 VENTANA FLOTANTE (MODAL) PARA LEER EL MENSAJE */}
            {solicitudSeleccionada && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSolicitudSeleccionada(null)} // Cierra al hacer clic fuera
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()} // Evita que se cierre al hacer clic adentro
                    >
                        {/* Cabecera del Modal */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                <MessageSquare size={20} className="text-blue-500" />
                                Mensaje Completo
                            </h3>
                            <button
                                onClick={() => setSolicitudSeleccionada(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cuerpo del Modal */}
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">De:</p>
                                <p className="font-bold text-slate-800 dark:text-white text-base">{solicitudSeleccionada.nombre} <span className="font-medium text-slate-500 dark:text-gray-400">({solicitudSeleccionada.empresa})</span></p>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">Cuerpo del mensaje:</p>
                                <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl text-slate-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed border border-slate-100 dark:border-gray-800 max-h-[40vh] overflow-y-auto custom-scrollbar">
                                    {solicitudSeleccionada.mensaje}
                                </div>
                            </div>
                        </div>

                        {/* Pie del Modal */}
                        <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 flex justify-end gap-3">
                            <button
                                onClick={() => abrirWhatsApp(solicitudSeleccionada.telefono, solicitudSeleccionada.nombre)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/60 font-semibold text-sm rounded-xl transition-colors"
                            >
                                <MessageCircle size={16} /> Responder por WhatsApp
                            </button>
                            <button
                                onClick={() => setSolicitudSeleccionada(null)}
                                className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}