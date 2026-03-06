'use client';

import { Target, Lightbulb, Users, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function AboutSection() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const cards = [
        {
            icon: Target,
            title: "Misión Clara",
            description: "Simplificar procesos complejos mediante herramientas digitales intuitivas y potentes."
        },
        {
            icon: Lightbulb,
            title: "Innovación",
            description: "Buscamos constantemente nuevas formas de resolver los desafíos de la industria moderna."
        },
        {
            icon: Users,
            title: "Equipo Experto",
            description: "Un equipo multidisciplinario apasionado por la seguridad y el desarrollo de software."
        },
        {
            icon: TrendingUp,
            title: "Resultados",
            description: "Nos enfocamos en entregar valor tangible y medible para tu organización desde el día uno."
        }
    ];

    const getCardClass = (index: number) => {
        if (hoveredIndex === null) {
            // estado normal
            return 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 rounded-2xl scale-100 opacity-100 translate-y-0';
        }
        if (hoveredIndex === index) {
            // estado activo
            return 'bg-blue-600 border-blue-600 text-white scale-[1.1] z-20 rounded-md shadow-2xl translate-y-[-10px]';
        }
        // estado inactivo
        return 'bg-slate-50 dark:bg-gray-800 border-slate-100 dark:border-gray-700 text-slate-300 dark:text-gray-600 scale-90 opacity-40 blur-[2px] grayscale rounded-2xl';
    };

    return (
        <section id="nosotros" className="py-24 bg-white dark:bg-gray-950 relative transition-colors duration-300 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <div className="flex flex-col md:flex-row items-center mb-16 gap-8 md:gap-16">
                    {/* título vertical */}
                    <div className="w-full md:w-auto shrink-0 flex flex-col items-center md:items-start justify-center">

                        {/* primera parte */}
                        <div className="flex justify-center md:justify-start overflow-hidden mb-0 md:mb-2 items-baseline">
                            {/* signo de interrogación */}
                            <span
                                className="text-6xl md:text-8xl font-black text-blue-600 animate-fade-in-up inline-block hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-default mr-2"
                                style={{ animationDelay: '0s', opacity: 0 }}
                            >
                                ¿
                            </span>

                            {"QUIÉNES".split("").map((char, index) => (
                                <span
                                    key={`q-${index}`}
                                    className="text-5xl md:text-7xl font-black tracking-widest uppercase text-slate-900 dark:text-white animate-fade-in-up inline-block hover:text-blue-600 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-default"
                                    style={{ animationDelay: `${(index + 1) * 0.1}s`, opacity: 0 }}
                                >
                                    {char}
                                </span>
                            ))}
                        </div>

                        {/* segunda parte */}
                        <div className="flex justify-center md:justify-start overflow-hidden items-baseline">
                            {"SOMOS".split("").map((char, index) => (
                                <span
                                    key={`s-${index}`}
                                    className="text-5xl md:text-7xl font-black tracking-widest uppercase text-blue-600 animate-fade-in-up inline-block hover:text-slate-900 dark:text-gray-300 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-default"
                                    style={{ animationDelay: `${(index + 8) * 0.1}s`, opacity: 0 }}
                                >
                                    {char}
                                </span>
                            ))}
                            {/* signo final */}
                            <span
                                className="text-5xl md:text-7xl font-black text-blue-600 animate-fade-in-up inline-block hover:text-slate-900 dark:text-gray-300 hover:scale-110 hover:-translate-y-2 transition-all duration-300 cursor-default ml-2"
                                style={{ animationDelay: '1.3s', opacity: 0 }}
                            >
                                ?
                            </span>
                        </div>

                    </div>

                    {/* descripción */}
                    <div className="w-full md:flex-1 text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                            Liderando la <span className="text-blue-600">Gestión de Seguridad Digital</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-gray-400 leading-relaxed">
                            En <span className="font-bold text-slate-800 dark:text-gray-200">FORMAPP</span>, transformamos la forma en que las empresas gestionan sus registros obligatorios.
                            Brindamos herramientas que permiten pasar de archivos físicos pesados a un sistema ágil, donde la información es verídica, accesible y está lista para ser presentada en cualquier momento.
                        </p>
                    </div>
                </div>

                <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    {cards.map((card, index) => {
                        const Icon = card.icon;
                        const isHovered = hoveredIndex === index;

                        return (
                            <div
                                key={index}
                                onMouseEnter={() => setHoveredIndex(index)}
                                className={`p-8 border transition-all duration-500 ease-out cursor-default relative group ${getCardClass(index)}`}
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${isHovered ? 'bg-white/20 text-white rotate-6 scale-110' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                    <Icon size={28} />
                                </div>

                                <h3 className={`text-xl font-bold mb-3 transition-colors ${isHovered ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {card.title}
                                </h3>

                                <p className={`text-sm leading-relaxed transition-colors ${isHovered ? 'text-blue-100' : 'text-slate-600 dark:text-gray-400'}`}>
                                    {card.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
