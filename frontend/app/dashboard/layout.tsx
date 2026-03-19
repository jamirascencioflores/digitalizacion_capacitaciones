// frontend/app/dashboard/layout.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import { Menu, X, Moon, Sun, BellRing } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { BandejaProvider } from '@/context/BandejaContext';
import api from '@/services/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { user } = useAuth();
    const userRole = user?.rol?.trim().toLowerCase();
    const pathname = usePathname();

    // 🟢 ESTADOS DE NOTIFICACIONES
    const [notificaciones, setNotificaciones] = useState<any[]>([]);
    const [alertasPendientes, setAlertasPendientes] = useState(0);
    const [showNotificaciones, setShowNotificaciones] = useState(false);
    const notificacionesRef = useRef<HTMLDivElement>(null);
    const [mostrarCampana, setMostrarCampana] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 🟢 Escuchar preferencias del usuario (Notificaciones)
    useEffect(() => {
        const checkPrefs = () => {
            const prefNotif = localStorage.getItem('pref_notif');
            // Si es null (primera vez) o 'true', mostramos la campana
            setMostrarCampana(prefNotif === null || prefNotif === 'true');
        };

        checkPrefs(); // Revisar al cargar
        window.addEventListener('storage_pref_changed', checkPrefs); // Escuchar si cambian en el Sidebar

        return () => window.removeEventListener('storage_pref_changed', checkPrefs);
    }, []);

    // 🟢 1. Estado de autorización
    const [authorized, setAuthorized] = useState(false);

    // 🟢 FUNCIÓN PARA CARGAR NOTIFICACIONES
    const cargarNotificaciones = async () => {
        try {
            const res = await api.get('/notificaciones');
            setNotificaciones(res.data.notificaciones);
            setAlertasPendientes(res.data.sinLeer);
        } catch (error) {
            console.error("Error cargando notificaciones", error);
        }
    };

    // 🟢 2. El "Guardia de Seguridad" (Solo verifica el token)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            if (!authorized) {
                setAuthorized(true);
            }
        }
    }, [authorized, router]);

    // 🟢 NUEVO: Efecto que reacciona apenas carga el usuario
    useEffect(() => {
        if (userRole === 'administrador') {
            cargarNotificaciones();

            // Recargar notificaciones cada 1 minuto
            const intervalo = setInterval(() => {
                cargarNotificaciones();
            }, 60000);
            return () => clearInterval(intervalo);
        }
    }, [userRole]);

    // 🟢 CERRAR MENÚ AL HACER CLICK AFUERA
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificacionesRef.current && !notificacionesRef.current.contains(event.target as Node)) {
                setShowNotificaciones(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 🟢 MANEJAR CLICK EN NOTIFICACIÓN
    const handleNotificacionClick = async (notificacion: any) => {
        setShowNotificaciones(false);
        if (!notificacion.leida) {
            try {
                await api.put(`/notificaciones/${notificacion.id}/leer`);
                cargarNotificaciones(); // Recargar para actualizar el número rojo
            } catch (error) {
                console.error("Error marcando como leída", error);
            }
        }
        if (notificacion.url_destino) {
            router.push(notificacion.url_destino);
        }
    };

    // 🟢 3. Pantalla de Carga
    if (!authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-gray-500 animate-pulse">Verificando credenciales...</span>
                </div>
            </div>
        );
    }

    // 🟢 4. Renderizamos el DISEÑO ORIGINAL con la campana activa
    return (
        <BandejaProvider>
            <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">

                <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <div className="flex-1 flex flex-col h-screen overflow-hidden">

                    <header className="flex h-16 items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-5 border-b border-gray-100/50 dark:border-gray-800 shadow-sm shrink-0 z-40 sticky top-0 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="md:hidden relative w-24 h-8 overflow-hidden rounded-md border border-gray-100/50 dark:border-gray-800 shadow-sm">
                                <Image
                                    src="/logo_empresa.png"
                                    alt="Logo Móvil"
                                    fill
                                    sizes="(max-width: 768px) 100px, 100px"
                                    className="object-contain p-1 bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            {userRole === 'administrador' && (
                                <>
                                    {mounted && (
                                        <button
                                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                            className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-300 dark:hover:text-amber-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-300 active:scale-90 border border-transparent hover:border-blue-100 dark:hover:border-gray-700 hidden md:block"
                                            title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                                        >
                                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                                        </button>
                                    )}

                                    {/* 🟢 CONTENEDOR DE LA CAMPANA Y EL MENÚ (Ahora controlado por mostrarCampana) */}
                                    {mostrarCampana && (
                                        <div className="relative hidden md:block" ref={notificacionesRef}>
                                            <button
                                                onClick={() => setShowNotificaciones(!showNotificaciones)}
                                                className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-300 active:scale-90 border border-transparent hover:border-blue-100 dark:hover:border-gray-700"
                                                title="Notificaciones"
                                            >
                                                <BellRing size={20} />
                                                {alertasPendientes > 0 && (
                                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                                                )}
                                            </button>

                                            {/* MENÚ DESPLEGABLE */}
                                            {showNotificaciones && (
                                                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden transform origin-top-right transition-all">
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Notificaciones</h3>
                                                        {alertasPendientes > 0 && (
                                                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                                                                {alertasPendientes} nuevas
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="max-h-80 overflow-y-auto">
                                                        {notificaciones.length === 0 ? (
                                                            <div className="p-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                                                                <BellRing size={24} className="opacity-20" />
                                                                No hay notificaciones recientes
                                                            </div>
                                                        ) : (
                                                            notificaciones.map((notif) => (
                                                                <div
                                                                    key={notif.id}
                                                                    onClick={() => handleNotificacionClick(notif)}
                                                                    className={`p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${!notif.leida ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                                >
                                                                    <p className={`text-sm leading-relaxed ${!notif.leida ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                        {notif.mensaje}
                                                                    </p>
                                                                    <span className="text-xs text-gray-400 mt-2 block font-medium">
                                                                        {new Date(notif.fecha_creacion).toLocaleDateString()} - {new Date(notif.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="md:hidden text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 p-2 rounded-xl transition-all duration-300 active:scale-90"
                                aria-label="Menú"
                            >
                                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 p-4 md:p-8 scroll-smooth flex flex-col transition-colors duration-300">
                        <div className="flex-1">
                            {children}
                        </div>

                        <footer className="mt-auto w-full pt-10 flex flex-col items-center justify-center border-t border-gray-200/60 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50 transition-colors duration-300">
                            <div className="flex flex-col items-center gap-3 opacity-70 hover:opacity-100 transition-all duration-300 select-none group cursor-default">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 tracking-[0.25em] uppercase group-hover:text-blue-600 dark:group-hover:text-amber-400 transition-colors">
                                    Desarrollado por
                                </span>
                                <div className="relative w-36 h-10 mt-1">
                                    <Image
                                        src="/nos_planet.png"
                                        alt="Nos Planét"
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-contain grayscale group-hover:grayscale-0 transition-all duration-500 drop-shadow-sm group-hover:drop-shadow-md"
                                    />
                                </div>
                                <span className="text-[10px] text-gray-300 font-light mt-1">
                                    © {new Date().getFullYear()} - Todos los derechos reservados
                                </span>
                            </div>
                        </footer>
                    </main>
                </div>
            </div>
        </BandejaProvider>
    );
}