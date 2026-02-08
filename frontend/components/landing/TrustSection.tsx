'use client';

import Image from 'next/image';
import { ShieldCheck, Server, Headphones } from 'lucide-react';

// sección de confianza
export default function TrustSection() {
    return (
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">

            {/* fondo decorativo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* texto */}
                    <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 text-xs font-semibold mb-6 border border-blue-700/50">
                            ALIANZAS ESTRATÉGICAS
                        </div>

                        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
                            Potenciado por líderes tecnológicos como <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">Nós Planét</span>
                        </h2>

                        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                            Para garantizar la máxima fiabilidad y seguridad, trabajamos de la mano con los mejores. Nuestra infraestructura se apoya en socios tecnológicos de primer nivel.
                        </p>

                        <div className="space-y-6">
                            <div className="group flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-slate-800/50 border border-transparent hover:border-slate-800">
                                <div className="p-3 rounded-lg bg-slate-800 text-green-400 group-hover:scale-110 transition-transform">
                                    <Server size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-100 group-hover:text-green-400 transition-colors">Infraestructura Robusta</h4>
                                    <p className="text-slate-400">Servidores de alta disponibilidad con redundancia automática.</p>
                                </div>
                            </div>

                            <div className="group flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-slate-800/50 border border-transparent hover:border-slate-800">
                                <div className="p-3 rounded-lg bg-slate-800 text-blue-400 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-100 group-hover:text-blue-400 transition-colors">Seguridad Bancaria</h4>
                                    <p className="text-slate-400">Tus datos encriptados de extremo a extremo.</p>
                                </div>
                            </div>

                            <div className="group flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-slate-800/50 border border-transparent hover:border-slate-800">
                                <div className="p-3 rounded-lg bg-slate-800 text-purple-400 group-hover:scale-110 transition-transform">
                                    <Headphones size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-100 group-hover:text-purple-400 transition-colors">Soporte Especializado</h4>
                                    <p className="text-slate-400">Equipo de ingenieros listos para resolver tus dudas.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* imagen destacada */}
                    <div className="relative flex justify-center lg:justify-end">

                        {/* tarjeta con efecto de vidrio */}
                        <div className="group relative w-full max-w-sm bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 hover:border-blue-500/50 transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">

                            {/* etiqueta */}
                            <div className="absolute top-4 right-4 px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-slate-500 border border-slate-800">
                                VERIFIED PARTNER
                            </div>

                            <div className="flex flex-col items-center text-center">

                                {/* logo integrado */}
                                <div className="relative w-48 h-20 mb-6 transition-all duration-500 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 flex items-center justify-center">
                                    <Image
                                        src="/nos_planet.png"
                                        alt="Logo Nos Planét"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>

                                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mb-4 opacity-30 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <p className="text-slate-400 italic font-medium text-sm relative z-10 transition-colors group-hover:text-slate-300">
                                    &quot;Innovación que conecta, tecnología que protege.&quot;
                                </p>
                            </div>

                            {/* brillo interno */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}
