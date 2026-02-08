'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, PlayCircle, BarChart3, Users, CheckCircle, Shield } from 'lucide-react';

// sección principal
export default function Hero() {
    return (
        <div id="inicio" className="relative pt-24 pb-40 lg:pt-36 lg:pb-64 overflow-hidden">

            {/* imagen de fondo */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
                    alt="Equipo Corporativo Analizando Datos"
                    fill
                    className="object-cover"
                    priority
                />
                {/* superposición oscura */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-900/40"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* texto principal */}
                    <div className="text-left animate-in fade-in slide-in-from-left-8 duration-700">
                        {/* título */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                            Seguridad SST <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                Digital e Inteligente
                            </span>
                        </h1>

                        {/* descripción */}
                        <p className="mt-4 text-xl text-slate-300 mb-8 leading-relaxed max-w-lg">
                            Olvídate del papel. Centraliza capacitaciones, asistencia y cumplimiento normativo en una plataforma empresarial robusta.
                        </p>

                        {/* botones */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-start items-start">
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:scale-[1.02]"
                            >
                                Iniciar Ahora
                                <ArrowRight size={18} />
                            </Link>

                            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-slate-200 border border-slate-600 rounded-lg hover:bg-white/10 transition-all">
                                <PlayCircle size={18} />
                                Ver Demo
                            </button>
                        </div>
                    </div>

                    {/* demostración flotante */}
                    <div className="relative hidden lg:block animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
                        {/* contenedor con perspectiva */}
                        <div className="relative rounded-xl border border-white/20 bg-slate-900/80 backdrop-blur-md p-2 shadow-2xl shadow-blue-900/20 transform rotate-y-[-5deg] hover:rotate-0 transition-transform duration-500">

                            {/* interfaz limpia */}
                            <div className="grid grid-cols-4 gap-4 p-6 min-h-[400px]">
                                {/* barra lateral */}
                                <div className="col-span-1 space-y-4 border-r border-white/5 pr-4">
                                    <div className="h-8 w-8 rounded-lg bg-blue-600 mb-6"></div>
                                    <div className="h-2 w-full rounded bg-slate-700/50"></div>
                                    <div className="h-2 w-3/4 rounded bg-slate-700/50"></div>
                                    <div className="h-2 w-5/6 rounded bg-slate-700/50"></div>

                                    <div className="mt-auto pt-12">
                                        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                            <div className="h-1.5 w-1/2 bg-blue-400 rounded mb-2"></div>
                                            <div className="h-1 w-full bg-blue-900 rounded-full overflow-hidden">
                                                <div className="h-full w-[85%] bg-blue-400"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* área de contenido */}
                                <div className="col-span-3 space-y-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="h-6 w-32 bg-slate-700/50 rounded"></div>
                                        <div className="flex gap-2">
                                            <div className="h-8 w-8 rounded-full bg-slate-700/50"></div>
                                            <div className="h-8 w-8 rounded-full bg-slate-700/50"></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                            <BarChart3 className="text-emerald-400 mb-2 h-5 w-5" />
                                            <div className="h-4 w-12 bg-slate-700 rounded mb-1"></div>
                                            <div className="h-2 w-16 bg-slate-700/50 rounded"></div>
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
                                            <Users className="text-blue-400 mb-2 h-5 w-5" />
                                            <div className="h-4 w-12 bg-slate-700 rounded mb-1"></div>
                                            <div className="h-2 w-16 bg-slate-700/50 rounded"></div>
                                        </div>
                                    </div>

                                    {/* lista de registros */}
                                    <div className="space-y-3 pt-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-700"></div>
                                                    <div>
                                                        <div className="h-2 w-24 bg-slate-600 rounded mb-1"></div>
                                                        <div className="h-1.5 w-16 bg-slate-700 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-1 bg-green-500/20 rounded text-green-400 text-[10px] font-bold">
                                                    APROBADO
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* tarjeta flotante */}
                        <div className="absolute -bottom-12 -left-8 w-48 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-2xl animate-bounce duration-[4000ms]">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Shield size={20} /></div>
                                <div className="text-xs font-bold text-white">Seguridad</div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-700 rounded-full mb-1">
                                <div className="h-full w-full bg-blue-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-[10px] text-slate-400 text-right">100% Verificado</div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
