// frontend/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAlertas } from '@/context/AlertasContext';
import { useBandeja } from '@/context/BandejaContext';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    LogOut,
    ClipboardCheck,
    PlusCircle,
    ShieldAlert,
    X,
    Moon,
    BellRing,
    Bot,
    Loader2,
    Inbox // 🟢 NUEVO: Importamos el ícono de la bandeja
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { alertasPendientes } = useAlertas();
    const { pendientesCount } = useBandeja();
    const userRole = user?.rol?.trim().toLowerCase();

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Estado local visual para otros toggle
    const [notifActive, setNotifActive] = useState(true);
    const [botActive, setBotActive] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLinkClick = (path: string) => {
        onClose();
    };

    const linkClass = (path: string) => `
    flex items-center gap-3 rounded-xl px-4 py-3 my-1 transition-all duration-300 group
    ${pathname === path
            ? 'bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20 translate-x-1'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:translate-x-1'}
  `;

    return (
        <>
            {/* barra lateral */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 h-dvh transform bg-white dark:bg-[#0B1121] shadow-2xl md:shadow-none md:border-r border-gray-100/80 dark:border-gray-800/80
        transition-transform duration-300 ease-out flex flex-col shrink-0 will-change-transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>

                {/* logo de empresa */}
                <div className="flex flex-col items-center justify-center py-8 border-b border-gray-100/80 dark:border-gray-800/60 bg-white dark:bg-[#0B1121] relative">
                    <div className="absolute top-4 right-4 md:hidden">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 active:scale-95 shadow-sm border border-transparent hover:border-red-100"
                            aria-label="Cerrar menú"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="relative h-16 w-44 mb-3 hover:scale-105 transition-transform duration-500 cursor-pointer">
                        <Image
                            src="/logo_empresa.png"
                            alt="Logo Pampa Baja"
                            fill
                            sizes="(max-width: 768px) 100vw, 200px"
                            className="object-contain drop-shadow-sm"
                            priority
                        />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] text-blue-500/80 font-bold uppercase tracking-[0.2em] select-none">by Nos Planet</p>
                    </div>
                </div>

                {/* navegación */}
                <nav className="mt-4 pb-8 space-y-1 px-3 flex-1 overflow-y-auto custom-scrollbar">

                    <Link href="/dashboard" className={linkClass('/dashboard')} onClick={() => handleLinkClick('/dashboard')}>
                        <LayoutDashboard size={20} className="transition-transform group-hover:scale-110" />
                        <span>Inicio</span>
                    </Link>

                    {/* nueva capacitación (oculto para auditor) */}
                    {userRole !== 'auditor' && (
                        <Link href="/dashboard/capacitaciones/crear" className={linkClass('/dashboard/capacitaciones/crear')} onClick={() => handleLinkClick('/dashboard/capacitaciones/crear')}>
                            <PlusCircle size={20} className="transition-transform group-hover:scale-110" />
                            <span>Nueva Capacitación</span>
                        </Link>
                    )}

                    {/* gestión de cumplimiento */}
                    {(userRole === 'administrador' || userRole === 'auditor') && (
                        <Link href="/dashboard/gestion" className={linkClass('/dashboard/gestion')} onClick={() => handleLinkClick('/dashboard/gestion')}>
                            <ClipboardCheck size={20} className="transition-transform group-hover:scale-110" />
                            <span>Gestión Cumplimiento</span>
                        </Link>
                    )}

                    <Link href="/dashboard/reportes" className={linkClass('/dashboard/reportes')} onClick={() => handleLinkClick('/dashboard/reportes')}>
                        <FileText size={20} className="transition-transform group-hover:scale-110" />
                        <span>Reportes</span>
                    </Link>

                    {/* sección de administración */}
                    {userRole === 'administrador' && (
                        <>
                            <div className="my-6 border-t border-gray-100/60 mx-4"></div>
                            <p className="px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Administración</p>

                            {/* alertas y claves */}
                            <Link href="/dashboard/alertas" className={`${linkClass('/dashboard/alertas')} relative`} onClick={() => handleLinkClick('/dashboard/alertas')}>
                                <ShieldAlert size={20} className={`transition-transform group-hover:scale-110 ${alertasPendientes > 0 ? "text-red-500 animate-pulse" : ""}`} />
                                <span>Alertas / Claves</span>

                                {/* notificaciones pendientes */}
                                {alertasPendientes > 0 && (
                                    <span className="absolute right-4 bg-red-500 shadow-md shadow-red-500/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in">
                                        {alertasPendientes}
                                    </span>
                                )}
                            </Link>

                            <Link href="/dashboard/usuarios" className={linkClass('/dashboard/usuarios')} onClick={() => handleLinkClick('/dashboard/usuarios')}>
                                <Users size={20} className="transition-transform group-hover:scale-110" />
                                <span>Usuarios</span>
                            </Link>

                            <Link href="/dashboard/trabajadores" className={linkClass('/dashboard/trabajadores')} onClick={() => handleLinkClick('/dashboard/trabajadores')}>
                                <Users size={20} className="transition-transform group-hover:scale-110" />
                                <span>Trabajadores</span>
                            </Link>

                            {/* 🟢 NUEVA RUTA: BANDEJA WEB CON ALERTA */}
                            <Link href="/dashboard/bandeja" className={`${linkClass('/dashboard/bandeja')} relative`} onClick={() => handleLinkClick('/dashboard/bandeja')}>
                                <Inbox size={20} className={`transition-transform group-hover:scale-110 ${pendientesCount > 0 ? "text-orange-500 animate-pulse" : ""}`} />
                                <span>Bandeja Web</span>

                                {/* Burbuja de notificación estilo "Mensaje de WhatsApp" */}
                                {pendientesCount > 0 && (
                                    <span className="absolute right-4 bg-orange-500 shadow-md shadow-orange-500/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in">
                                        {pendientesCount}
                                    </span>
                                )}
                            </Link>

                            {/* --- CONFIGURACIONES --- */}
                            <div className="mt-8 border-t border-gray-100/60 mx-4 pt-6"></div>
                            <p className="px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 w-full">Configuración</p>

                            <div className="px-2 space-y-1">
                                {/* Modo Oscuro */}
                                <div className="flex items-center justify-between py-2 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <Moon size={20} />
                                        <span className="text-sm font-medium">Modo Oscuro</span>
                                    </div>
                                    {mounted && (
                                        <button className={`w-10 h-5 rounded-full relative transition-colors focus:outline-none shadow-inner ${theme === 'dark' ? 'bg-blue-500 border-blue-600' : 'bg-gray-200 border-gray-300 dark:bg-slate-700 dark:border-slate-600'} border`}>
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-px shadow-sm transition-transform ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </button>
                                    )}
                                </div>

                                {/* Notificaciones */}
                                <div className="flex items-center justify-between py-2 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setNotifActive(!notifActive)}>
                                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <BellRing size={20} />
                                        <span className="text-sm font-medium">Notificaciones</span>
                                    </div>
                                    <button className={`w-10 h-5 rounded-full relative transition-colors focus:outline-none shadow-inner ${notifActive ? 'bg-blue-500 border-blue-600' : 'bg-gray-200 border-gray-300 dark:bg-slate-700 dark:border-slate-600'} border`}>
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-px shadow-sm transition-transform ${notifActive ? 'right-0.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>

                                {/* Bot */}
                                <div className="flex items-center justify-between py-2 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setBotActive(!botActive)}>
                                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <Bot size={20} />
                                        <span className="text-sm font-medium">Planet Bot</span>
                                    </div>
                                    <button className={`w-10 h-5 rounded-full relative transition-colors focus:outline-none shadow-inner ${botActive ? 'bg-blue-500 border-blue-600' : 'bg-gray-200 border-gray-300 dark:bg-slate-700 dark:border-slate-600'} border`}>
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-px shadow-sm transition-transform ${botActive ? 'right-0.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </nav>

                {/* usuario y cerrar sesión */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0B1121]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-blue-50 dark:ring-slate-700">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate tracking-tight">{user?.nombre}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize tracking-wide">{user?.rol}</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-red-100 transition-all duration-300 text-sm font-semibold active:scale-95"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* fondo oscuro móvil con difuminado (glassmorphism) */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
                />
            )}
        </>
    );
}