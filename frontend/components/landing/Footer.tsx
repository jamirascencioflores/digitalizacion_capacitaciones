'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

// pie de página
export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 text-gray-300 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white mb-4">
                            <div className="bg-blue-600 p-1.5 rounded-lg">
                                <ShieldCheck size={24} />
                            </div>
                            <span className="text-xl font-bold">FORMAPP</span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400">
                            Transformamos la gestión de cumplimiento y auditoría con tecnología inteligente. Simplificamos tus procesos para que siempre estés listo ante cualquier inspección.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <a href="#" className="hover:text-blue-500 transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="hover:text-blue-400 transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-blue-600 transition-colors"><Linkedin size={20} /></a>
                            <a href="#" className="hover:text-pink-500 transition-colors"><Instagram size={20} /></a>
                        </div>
                    </div>

                    {/* enlaces rápidos */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">Plataforma</h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/login" className="hover:text-blue-400 transition-colors">Iniciar Sesión</Link></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Registro de Capacitaciones</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Validación Biométrica</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Reportes de Seguridad</a></li>
                        </ul>
                    </div>

                    {/* legal */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">Legal</h3>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Términos y Condiciones</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Política de Privacidad</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Protección de Datos</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Cookies</a></li>
                        </ul>
                    </div>

                    {/* contacto */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">Contacto</h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-center gap-3">
                                <Phone size={18} className="text-blue-500 shrink-0" />
                                <span>+51 987 654 321</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="text-blue-500 shrink-0" />
                                <span>contacto@formapp.pe</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* barra inferior */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <p>© {currentYear} FORMAPP. Todos los derechos reservados.</p>
                    <div className="flex gap-6">
                        <span>Desarrollado con ❤️ por el equipo de FORMAPP</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
