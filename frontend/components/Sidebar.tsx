// frontend/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAlertas } from '@/context/AlertasContext';
import {
    LayoutDashboard,
    FileText,
    Users,
    LogOut,
    ClipboardCheck,
    PlusCircle,
    ShieldAlert
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { alertasPendientes } = useAlertas();
    const userRole = user?.rol?.trim().toLowerCase();

    const linkClass = (path: string) => `
    flex items-center gap-3 rounded-lg px-4 py-3 transition group
    ${pathname === path
            ? 'bg-green-50 text-green-700 font-bold'
            : 'text-gray-600 hover:bg-green-50 hover:text-green-700 font-medium'}
            
  `;

    return (
        <>
            {/* SIDEBAR ASIDE */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl 
        transition-transform duration-300 ease-in-out flex flex-col shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>

                {/* --- LOGO EMPRESA --- */}
                <div className="flex flex-col items-center justify-center py-6 border-b border-gray-200 bg-white">
                    <div className="relative h-16 w-40 mb-3">
                        <Image
                            src="/logo_empresa.png"
                            alt="Logo Pampa Baja"
                            fill
                            sizes="(max-width: 768px) 100vw, 200px"
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] text-green-600 font-medium">by Nos Planet</p>
                    </div>
                </div>

                {/* --- NAVEGACIÓN --- */}
                <nav className="mt-6 space-y-1 px-3 flex-1 overflow-y-auto">

                    <Link href="/dashboard" className={linkClass('/dashboard')} onClick={onClose}>
                        <LayoutDashboard size={20} className="group-hover:text-green-600" />
                        <span>Inicio</span>
                    </Link>

                    {/* Nueva Capacitación: Oculto para el Auditor */}
                    {userRole !== 'auditor' && (
                        <Link href="/dashboard/capacitaciones/crear" className={linkClass('/dashboard/capacitaciones/crear')} onClick={onClose}>
                            <PlusCircle size={20} className="group-hover:text-green-600" />
                            <span>Nueva Capacitación</span>
                        </Link>
                    )}

                    {/* --- NUEVO: GESTIÓN DE CUMPLIMIENTO (Admin y Auditor) --- */}
                    {(userRole === 'administrador' || userRole === 'auditor') && (
                        <Link href="/dashboard/gestion" className={linkClass('/dashboard/gestion')} onClick={onClose}>
                            <ClipboardCheck size={20} className="group-hover:text-green-600" />
                            <span>Gestión Cumplimiento</span>
                        </Link>
                    )}

                    <Link href="/dashboard/reportes" className={linkClass('/dashboard/reportes')} onClick={onClose}>
                        <FileText size={20} className="group-hover:text-green-600" />
                        <span>Reportes</span>
                    </Link>

                    {/* SECCIÓN SOLO ADMIN */}
                    {userRole === 'administrador' && (
                        <>
                            <div className="my-4 border-t border-gray-100 mx-2"></div>
                            <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Administración</p>

                            {/* 🟢 NUEVO: ENLACE A ALERTAS CON GLOBO DE NOTIFICACIÓN */}
                            <Link href="/dashboard/alertas" className={`${linkClass('/dashboard/alertas')} relative`} onClick={onClose}>
                                <ShieldAlert size={20} className={alertasPendientes > 0 ? "text-red-500 animate-pulse" : "group-hover:text-red-600"} />
                                <span>Alertas / Claves</span>

                                {/* GLOBO ROJO FLOTANTE */}
                                {alertasPendientes > 0 && (
                                    <span className="absolute right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in">
                                        {alertasPendientes}
                                    </span>
                                )}
                            </Link>

                            <Link href="/dashboard/usuarios" className={linkClass('/dashboard/usuarios')} onClick={onClose}>
                                <Users size={20} className="group-hover:text-green-600" />
                                <span>Usuarios</span>
                            </Link>

                            <Link href="/dashboard/trabajadores" className={linkClass('/dashboard/trabajadores')} onClick={onClose}>
                                <Users size={20} className="group-hover:text-green-600" />
                                <span>Maestro Trabajadores</span>
                            </Link>
                        </>
                    )}
                </nav> {/* <--- 🔴 AQUÍ FALTABA EL CIERRE DE NAV */}

                {/* --- USUARIO Y SALIR --- */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs border border-green-200">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-700 truncate">{user?.nombre}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{user?.rol}</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-red-600 hover:bg-red-50 transition text-sm font-medium"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* --- FONDO OSCURO MÓVIL (Overlay) --- */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                />
            )}
        </>
    );
}