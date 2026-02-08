'use client';

import { useRef, useState } from 'react';
import { ScanFace, FileSpreadsheet, ShieldCheck, Zap, Cloud, Lock, ChevronLeft, ChevronRight } from 'lucide-react';

// sección de características
export default function Features() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const features = [
        {
            icon: <ScanFace className="w-8 h-8 text-blue-600" />,
            title: "Biometría Avanzada",
            desc: "Autenticación facial y dactilar para validar la identidad de cada trabajador en tiempo real."
        },
        {
            icon: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
            title: "Reportes Auditables",
            desc: "Generación automática de excel y pdf listos para sunafil, sin errores manuales."
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-purple-600" />,
            title: "Evidencia Inmutable",
            desc: "Respaldos fotográficos y geolocalización en cada registro para máxima seguridad legal."
        },
        {
            icon: <Zap className="w-8 h-8 text-yellow-500" />,
            title: "Cero Papel",
            desc: "Elimina los archivos físicos. Ahorra costos y contribuye con el medio ambiente."
        },
        {
            icon: <Cloud className="w-8 h-8 text-cyan-500" />,
            title: "Cloud 24/7",
            desc: "Acceso a tu información desde cualquier lugar y dispositivo con alta disponibilidad."
        },
        {
            icon: <Lock className="w-8 h-8 text-red-500" />,
            title: "Encriptación Bancaria",
            desc: "Tus datos viajan y se almacenan seguros con nuestros protocolos de ciberseguridad."
        }
    ];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev === features.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev === 0 ? features.length - 1 : prev - 1));
    };

    // desplazamiento automático (opcional)

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

                {/* encabezado */}
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Todo lo que necesitas para <span className="text-blue-600">auditorías exitosas</span>
                    </h2>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                        Diseñado específicamente para cumplir con la normativa y facilitar la vida de los prevencionistas.
                    </p>
                </div>

                {/* carrusel centrado */}
                <div className="relative max-w-6xl mx-auto h-[450px] flex items-center justify-center perspective-1000">

                    {/* indicadores */}
                    <div className="absolute -top-12 md:-top-8 left-1/2 -translate-x-1/2 flex gap-2 z-40">
                        {features.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-blue-300'
                                    }`}
                                aria-label={`Ir a diapositiva ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* botón anterior */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-2 top-0 md:top-1/2 md:-translate-y-1/2 md:left-8 z-50 p-4 rounded-full bg-white text-slate-800 shadow-xl border border-slate-100 hover:scale-110 hover:text-blue-600 transition-all duration-300 group"
                        aria-label="Anterior"
                    >
                        <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
                    </button>

                    {/* botón siguiente */}
                    <button
                        onClick={nextSlide}
                        className="absolute right-2 top-0 md:top-1/2 md:-translate-y-1/2 md:right-8 z-50 p-4 rounded-full bg-white text-slate-800 shadow-xl border border-slate-100 hover:scale-110 hover:text-blue-600 transition-all duration-300 group"
                        aria-label="Siguiente"
                    >
                        <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* elementos */}
                    <div className="relative w-full h-full flex items-center justify-center overflow-visible mt-8">
                        {/* permitir sombras externas */}
                        {features.map((item, index) => {
                            // calcular posición circular
                            // asegurar elementos a ambos lados
                            let position = index - currentIndex;
                            const total = features.length;

                            // ajuste circular
                            if (position > total / 2) position -= total;
                            if (position < -total / 2) position += total;

                            // mostrar solo 3 elementos
                            if (Math.abs(position) > 1) return null;

                            const isCenter = position === 0;

                            // estilos visuales
                            const spacing = 380; // espacio entre tarjetas
                            const translateX = position * spacing;

                            // estilos base
                            const scale = isCenter ? 1.1 : 0.85;
                            const zIndex = isCenter ? 30 : 10;
                            const opacity = isCenter ? 1 : 0.6; // transparencia lateral
                            const blur = isCenter ? '0px' : '4px'; // difuminado lateral

                            return (
                                <div
                                    key={index}
                                    className="absolute top-1/2 left-1/2 w-[340px] transition-all duration-500 ease-out cursor-pointer will-change-transform"
                                    style={{
                                        transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`,
                                        zIndex,
                                        opacity,
                                        filter: `blur(${blur})`
                                    }}
                                    onClick={() => setCurrentIndex(index)}
                                >
                                    <div className={`h-[380px] p-8 rounded-[2rem] border transition-all duration-500 flex flex-col justify-center relative overflow-hidden group
                                        ${isCenter
                                            ? 'bg-white shadow-[0_20px_50px_rgba(30,58,138,0.15)] border-blue-100' // central: blanco
                                            : 'bg-blue-600 border-blue-500 shadow-none' // laterales: azul
                                        }`}
                                    >
                                        {/* decoración fondo azul */}
                                        {!isCenter && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />}

                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-colors duration-300
                                            ${isCenter ? 'bg-blue-50 text-blue-600' : 'bg-white/20 text-white'}
                                        `}>
                                            {/* icono */}
                                            <div className={isCenter ? '' : 'text-white'}>
                                                {item.icon}
                                            </div>
                                        </div>

                                        <h3 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${isCenter ? 'text-slate-900' : 'text-white'}`}>
                                            {item.title}
                                        </h3>

                                        <p className={`text-sm leading-relaxed transition-colors duration-300 ${isCenter ? 'text-slate-600' : 'text-blue-100'}`}>
                                            {item.desc}
                                        </p>

                                        {/* botón central */}
                                        {isCenter && (
                                            <div className="mt-6 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                <ChevronRight size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </section>
    );
}
