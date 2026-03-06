'use client';

import Image from 'next/image';

// vista previa de la aplicación
export default function AppPreview() {
    return (
        <div className="relative z-20 -mt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

            {/* contenedor principal */}
            <div className="relative rounded-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-white/60 dark:border-gray-800 p-2 shadow-2xl shadow-blue-900/10 lg:rounded-3xl lg:p-3 ring-1 ring-black/5 overflow-hidden group transition-colors duration-300">

                {/* barra de título */}
                <div className="absolute top-0 left-0 right-0 h-8 md:h-10 bg-white/80 dark:bg-gray-800 backdrop-blur-md rounded-t-2xl z-10 flex items-center px-4 border-b border-gray-100/50 dark:border-gray-700">
                    <div className="flex gap-1.5 md:gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400/80" />
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="mx-auto text-[10px] md:text-xs font-medium text-gray-400/80 dark:text-gray-500 uppercase tracking-widest hidden sm:block">
                        FORMAPP DASHBOARD
                    </div>
                </div>

                {/* captura de pantalla */}
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-950 mt-8 md:mt-10 border border-gray-200/50 dark:border-gray-800">
                    <Image
                        src="/dashboard-screenshot.webp"
                        alt="Vista previa del Dashboard de FORMAPP"
                        fill
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                        priority
                        unoptimized // evitar errores locales
                    />

                    {/* efecto al pasar el mouse */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/5 dark:from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>

            </div>

            {/* fondo decorativo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-[50%] bg-blue-500/20 blur-[120px] -z-10 rounded-full pointer-events-none mix-blend-multiply" />
        </div>
    );
}
