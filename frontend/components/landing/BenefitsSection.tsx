'use client';

import { Zap, ShieldCheck, Smile, TrendingUp, Clock, FileCheck, BarChart3, Lock, Users, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function BenefitsSection() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // función para estilo visual de tarjetas
    const getCardClass = (index: number) => {
        if (hoveredIndex === null) return 'opacity-100 scale-100 blur-0'; // Estado normal
        if (hoveredIndex === index) return 'opacity-100 scale-[1.03] z-10 shadow-2xl shadow-blue-500/20 border-blue-500/50'; // Estado Hover (Activo)
        return 'opacity-40 scale-95 blur-[2px] grayscale-[50%]'; // Estado Inactivo (Otros)
    };

    return (
        <section id="beneficios" className="py-24 bg-slate-950 relative overflow-hidden text-white">

            {/* fondo con patrón */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* luces de fondo */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-6 relative">

                    <div className="max-w-2xl order-2 md:order-1 relative z-10">
                        <span className="relative z-10 inline-block text-blue-500 font-bold tracking-wider uppercase mb-2">
                            / Ventajas Competitivas
                        </span>

                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            Gestión Inteligente <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Sin Complicaciones</span>
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-8 md:mb-0">
                            Olvídate de las hojas de cálculo y el papeleo. Lleva tu gestión de seguridad al siglo XXI.
                        </p>
                    </div>

                    {/* insignia decorativa */}
                    <div className="order-1 md:order-2 w-full md:w-auto flex justify-center md:block mb-8 md:mb-0 transform md:translate-y-4">
                        <div className="relative transform rotate-6 z-20">
                            <div className="relative">
                                {/* icono flotante */}
                                <div className="absolute -top-8 -left-8 bg-yellow-400 text-blue-900 p-3 rounded-xl shadow-lg transform -rotate-12 z-20 border-2 border-white">
                                    <TrendingUp size={32} />
                                </div>

                                {/* cuadro de texto */}
                                <div className="bg-blue-600 text-white px-10 py-5 shadow-2xl shadow-blue-600/40 border-4 border-white/10 backdrop-blur-md rounded-2xl">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none text-center">
                                        ¿Por Qué <br /> Elegirnos?
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* cuadrícula de beneficios */}
                <div
                    className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[600px]"
                    onMouseLeave={() => setHoveredIndex(null)} // reiniciar al salir
                >

                    {/* tarjeta: tiempo */}
                    <div
                        onMouseEnter={() => setHoveredIndex(1)}
                        className={`md:col-span-2 md:row-span-2 relative group overflow-hidden bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/10 transition-all duration-500 ${getCardClass(1)}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 h-full flex flex-col">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-blue-500/20">
                                <Clock size={32} />
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-4">Recupera tu Tiempo</h3>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8 flex-grow">
                                Nuestros clientes reportan una reducción del <span className="text-white font-bold">40%</span> en tareas administrativas. Automatiza lo aburrido y enfócate en prevenir accidentes.
                            </p>

                            {/* gráfico pequeño */}
                            <div className="mt-auto bg-slate-950/50 rounded-xl p-4 border border-white/5">
                                <div className="flex items-end gap-2 h-24">
                                    <div className="w-1/4 bg-slate-800 rounded-t-lg h-[40%]"></div>
                                    <div className="w-1/4 bg-slate-800 rounded-t-lg h-[60%]"></div>
                                    <div className="w-1/4 bg-slate-700 rounded-t-lg h-[50%]"></div>
                                    <div className="w-1/4 bg-blue-500 rounded-t-lg h-[90%] relative">
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-400 opacity-100">
                                            Ahora
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* tarjeta: legal */}
                    <div
                        onMouseEnter={() => setHoveredIndex(2)}
                        className={`md:col-span-2 md:row-span-1 relative group overflow-hidden bg-slate-900/50 backdrop-blur-md p-5 md:p-8 rounded-3xl border border-white/10 transition-all duration-500 ${getCardClass(2)}`}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                                <ShieldCheck size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Blindaje Legal Sunafil</h3>
                                <p className="text-slate-400">
                                    Formatos actualizados automáticamente a la normativa vigente. Evita multas por errores de papeleo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* tarjeta: digitalización */}
                    <div
                        onMouseEnter={() => setHoveredIndex(3)}
                        className={`md:col-span-1 md:row-span-1 relative group overflow-hidden bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-white/10 transition-all duration-500 ${getCardClass(3)}`}
                    >
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
                            <FileCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Cero Papel</h3>
                        <p className="text-slate-400 text-sm">
                            Digitaliza todo. Accede a tus documentos desde cualquier lugar, 24/7.
                        </p>
                    </div>

                    {/* tarjeta: datos */}
                    <div
                        onMouseEnter={() => setHoveredIndex(4)}
                        className={`md:col-span-1 md:row-span-1 relative group overflow-hidden bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-white/10 transition-all duration-500 ${getCardClass(4)}`}
                    >
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-4 border border-amber-500/20">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Data Real</h3>
                        <p className="text-slate-400 text-sm">
                            Dashboards que transforman datos en decisiones estratégicas.
                        </p>
                    </div>

                </div>

            </div>
        </section>
    );
}
