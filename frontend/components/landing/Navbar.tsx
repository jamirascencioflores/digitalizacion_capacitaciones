'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, Menu, X, Home, Users, Briefcase, Mail, Handshake, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

// barra de navegación
export default function Navbar() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // detectar desplazamiento
    useEffect(() => {
        const handleScroll = () => {
            // cambiar estilo al desplazar
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // estilos dinámicos
    const navBackground = isScrolled
        ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm'
        : 'bg-transparent border-transparent';

    const textColor = isScrolled ? 'text-slate-600' : 'text-white/90';
    const hoverColor = isScrolled ? 'hover:text-blue-600' : 'hover:text-white';
    const iconColor = isScrolled ? 'text-slate-400 group-hover:text-blue-600' : 'text-blue-200 group-hover:text-white';

    // texto del logo
    const logoTextClass = isScrolled
        ? 'bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500' // color al bajar
        : 'text-white'; // color inicial

    // botón de acceso
    const loginButtonClass = isScrolled
        ? 'bg-slate-900 text-white hover:bg-slate-800'
        : 'bg-white text-blue-900 hover:bg-blue-50'; // estilo destacado

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBackground} ${isScrolled ? 'h-20' : 'h-24'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex justify-between items-center h-full">

                    {/* logotipo */}
                    <Link href="/#inicio" className="flex-shrink-0 flex items-center gap-2 cursor-pointer transition hover:opacity-80">
                        <div className={`p-2 rounded-lg transition-colors ${isScrolled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 text-white backdrop-blur-sm border border-white/20'}`}>
                            <ShieldCheck size={28} />
                        </div>
                        <span className={`text-2xl font-bold transition-colors ${logoTextClass}`}>
                            FORMAPP
                        </span>
                    </Link>

                    {/* menú principal */}
                    <div className="hidden md:flex items-center gap-8">
                        <nav className={`flex gap-6 text-sm font-medium ${textColor}`}>
                            <Link href="/#inicio" className={`flex items-center gap-2 transition-colors group ${hoverColor}`}>
                                <Home size={16} className={`transition-colors ${iconColor}`} />
                                <span>Inicio</span>
                            </Link>
                            <Link href="/#nosotros" className={`flex items-center gap-2 transition-colors group ${hoverColor}`}>
                                <Users size={16} className={`transition-colors ${iconColor}`} />
                                <span>Nosotros</span>
                            </Link>
                            <Link href="/#servicios" className={`flex items-center gap-2 transition-colors group ${hoverColor}`}>
                                <Briefcase size={16} className={`transition-colors ${iconColor}`} />
                                <span>Servicios</span>
                            </Link>
                            <Link href="/#beneficios" className={`flex items-center gap-2 transition-colors group ${hoverColor}`}>
                                <TrendingUp size={16} className={`transition-colors ${iconColor}`} />
                                <span>Beneficios</span>
                            </Link>
                            <Link href="/#contacto" className={`flex items-center gap-2 transition-colors group ${hoverColor}`}>
                                <Mail size={16} className={`transition-colors ${iconColor}`} />
                                <span>Contacto</span>
                            </Link>
                        </nav>

                        <div className={`h-6 w-px ${isScrolled ? 'bg-slate-200' : 'bg-white/20'}`}></div>

                        <button
                            onClick={() => {
                                setIsLoggingIn(true);
                                router.push('/login');
                            }}
                            disabled={isLoggingIn}
                            className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg hover:-translate-y-0.5 ${loginButtonClass} ${isLoggingIn ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isLoggingIn ? (
                                <>
                                    <span>Cargando...</span>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Sesión</span>
                                    <LogIn size={16} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* botón menú móvil */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`transition p-2 rounded-md ${isScrolled ? 'text-gray-600 hover:bg-gray-50' : 'text-white hover:bg-white/10'}`}
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* menú desplegable */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 animate-in slide-in-from-top-5 shadow-xl z-40">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        <nav className="flex flex-col gap-1 mb-4">
                            <Link href="/#inicio" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Home size={18} /> <span>Inicio</span>
                            </Link>
                            <Link href="/#nosotros" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Users size={18} /> <span>Nosotros</span>
                            </Link>
                            <Link href="/#servicios" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Briefcase size={18} /> <span>Servicios</span>
                            </Link>
                            <Link href="/#beneficios" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <TrendingUp size={18} /> <span>Beneficios</span>
                            </Link>
                            <Link href="/#contacto" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                                <Mail size={18} /> <span>Contacto</span>
                            </Link>
                        </nav>
                        <button
                            onClick={() => {
                                setIsLoggingIn(true);
                                setIsOpen(false);
                                router.push('/login');
                            }}
                            disabled={isLoggingIn}
                            className={`flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium shadow-md active:scale-95 transition ${isLoggingIn ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isLoggingIn ? (
                                <>
                                    <span>Cargando...</span>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </>
                            ) : (
                                <span>Ingresar a la Plataforma</span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
