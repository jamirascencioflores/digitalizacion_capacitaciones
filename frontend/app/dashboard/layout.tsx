// frontend/app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar'; // <--- Importamos el componente
import { Menu, X, Moon, Sun, BellRing, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useAlertas } from '@/context/AlertasContext';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { user } = useAuth();
    const { alertasPendientes } = useAlertas();
    const userRole = user?.rol?.trim().toLowerCase();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">

            {/* --- COMPONENTE SIDEBAR --- */}
            {/* Le pasamos el estado y la función para cerrar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* --- HEADER SUPERIOR (NAVBAR) --- */}
                <header className="flex h-16 items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-5 border-b border-gray-100/50 dark:border-gray-800 shadow-sm shrink-0 z-40 sticky top-0 transition-all duration-300">
                    <div className="flex items-center gap-4">


                        {/* Logo Móvil */}
                        <div className="md:hidden relative w-24 h-8 overflow-hidden rounded-md border border-gray-100/50 dark:border-gray-800 shadow-sm">
                            <Image
                                src="/logo_empresa.png"
                                alt="Logo Móvil"
                                fill
                                sizes="(max-width: 768px) 100px, 100px"
                                className="object-contain p-1 bg-white"
                            />
                        </div>

                        {/* Título en Desktop */}
                        <div className="hidden md:block">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Panel Administrativo</h2>
                        </div>
                    </div>

                    {/* Controles Rápidos (Desktop & Mobile) */}
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

                                <button
                                    className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-300 active:scale-90 border border-transparent hover:border-blue-100 dark:hover:border-gray-700 hidden md:block"
                                    title="Notificaciones"
                                >
                                    <BellRing size={20} />
                                    {alertasPendientes > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900 animate-pulse"></span>
                                    )}
                                </button>
                            </>
                        )}

                        {/* Menú Móvil (movido a la derecha) */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 p-2 rounded-xl transition-all duration-300 active:scale-90"
                            aria-label="Menú"
                        >
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </header>

                {/* Área de Trabajo (Scrollable) */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 p-4 md:p-8 scroll-smooth flex flex-col transition-colors duration-300">

                    {/* Aquí se renderizan las páginas (Reportes, Crear, Trabajadores, etc) */}
                    <div className="flex-1">
                        {children}
                    </div>

                    {/* --- FOOTER NOS PLANÉT --- */}
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
    );
}