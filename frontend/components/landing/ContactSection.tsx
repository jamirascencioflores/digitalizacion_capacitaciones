'use client';

import { Mail, MapPin, Phone, Send, User, MessageSquare, Building2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

// formulario de contacto
export default function ContactSection() {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // simular envío
        setTimeout(() => setIsSubmitting(false), 2000);
    };

    return (
        <section id="contacto" className="relative py-24 bg-slate-950 overflow-hidden">

            {/* fondo principal */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
                    alt="Oficina Moderna"
                    fill
                    className="object-cover opacity-20"
                    priority
                    unoptimized
                />
                {/* degradado oscuro */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-blue-900/40" />
            </div>

            {/* decoración de fondo */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <div className="text-center mb-16">

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Hablemos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Tu Proyecto</span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Estamos listos para escalar la seguridad de tu empresa al siguiente nivel.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* información de contacto */}
                    <div className="lg:col-span-5 space-y-4">

                        {/* tarjeta principal */}
                        <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <h3 className="text-2xl font-bold text-white mb-6 relative z-10">Información de Contacto</h3>

                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover/item:scale-110 transition-transform">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Llámanos</p>
                                        <p className="text-white font-medium hover:text-blue-400 transition-colors cursor-pointer">+51 987 654 321</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover/item:scale-110 transition-transform">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Escríbenos</p>
                                        <p className="text-white font-medium hover:text-emerald-400 transition-colors cursor-pointer">contacto@nosplanet.com</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover/item:scale-110 transition-transform">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Visítanos</p>
                                        <p className="text-white font-medium hover:text-purple-400 transition-colors cursor-pointer">San Isidro, Lima - Perú</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* tarjeta secundaria */}
                        <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-white/10 h-48 relative overflow-hidden group">
                            {/* mapa abstracto */}
                            <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,#3b82f6_0%,transparent_50%)] blur-3xl"></div>
                            </div>
                            <div className="relative z-10 flex flex-col justify-end h-full">
                                <p className="text-white font-bold text-lg">Cobertura Nacional</p>
                                <p className="text-slate-400 text-sm">Operamos en todo el Perú</p>
                            </div>
                        </div>

                    </div>

                    {/* formulario */}
                    <div className="lg:col-span-7">
                        <div className="bg-slate-900/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                            {/* borde superior */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50"></div>

                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wide">Nombre</label>
                                        <div className={`relative group transition-all duration-300 ${focusedField === 'name' ? 'scale-[1.02]' : ''}`}>
                                            <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                id="name"
                                                onFocus={() => setFocusedField('name')}
                                                onBlur={() => setFocusedField(null)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white"
                                                placeholder="Tu nombre"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="company" className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wide">Empresa</label>
                                        <div className={`relative group transition-all duration-300 ${focusedField === 'company' ? 'scale-[1.02]' : ''}`}>
                                            <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                                <Building2 size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                id="company"
                                                onFocus={() => setFocusedField('company')}
                                                onBlur={() => setFocusedField(null)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white"
                                                placeholder="Tu empresa"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wide">Email Corporativo</label>
                                    <div className={`relative group transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                                        <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            id="email"
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white"
                                            placeholder="nombre@nosplanet.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wide">Mensaje</label>
                                    <div className={`relative group transition-all duration-300 ${focusedField === 'message' ? 'scale-[1.02]' : ''}`}>
                                        <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                            <MessageSquare size={18} />
                                        </div>
                                        <textarea
                                            id="message"
                                            rows={4}
                                            onFocus={() => setFocusedField('message')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-white resize-none"
                                            placeholder="Detalles sobre tu proyecto..."
                                            required
                                        ></textarea>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                                        {!isSubmitting && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                </button>
                            </form>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}
