// frontend/app/dashboard/layout.tsx
'use client';

import { useState, useEffect } from 'react'; // 🟢 Agregamos useEffect
import { useRouter } from 'next/navigation'; // 🟢 Agregamos useRouter
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 🟢 1. Estado de autorización (Empieza en falso para no mostrar nada aún)
    const [authorized, setAuthorized] = useState(false);

    // 🟢 2. El "Guardia de Seguridad"
    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            router.push('/login');
        } else {
            // Verificamos si ya está autorizado para evitar re-renders innecesarios
            if (!authorized) {
                setAuthorized(true);
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 👈 Usamos [] para que solo verifique AL ENTRAR (Montar), no a cada rato.

    // 🟢 3. Pantalla de Carga (mientras verifica)
    // Esto evita que el dashboard "parpadee" antes de redirigir si no está logueado
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

    // 🟢 4. Si pasó la seguridad, renderizamos TU DISEÑO ORIGINAL
    return (
        <div className="flex min-h-screen bg-gray-100">

            {/* --- COMPONENTE SIDEBAR --- */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header Móvil */}
                <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm md:hidden shrink-0 z-40 relative">
                    <span className="font-bold text-green-800 text-sm">AGRÍCOLA PAMPA BAJA</span>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600">
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Área de Trabajo */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 scroll-smooth flex flex-col">

                    {/* Contenido de las páginas */}
                    <div className="flex-1">
                        {children}
                    </div>

                    {/* --- FOOTER NOS PLANÉT --- */}
                    <footer className="mt-auto w-full pt-10 flex flex-col items-center justify-center border-t border-gray-200/60 bg-gray-50/50">
                        <div className="flex flex-col items-center gap-3 opacity-70 hover:opacity-100 transition-all duration-300 select-none group cursor-default">

                            <span className="text-[11px] font-semibold text-gray-400 tracking-[0.25em] uppercase group-hover:text-blue-600 transition-colors">
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