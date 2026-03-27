'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function SplashScreen({ message = "Preparando tu sesión..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] animate-in fade-in duration-500">
            {/* Fondo con gradiente sutil */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative flex flex-col items-center">
                {/* Logo con animación de entrada */}
                <div className="relative h-24 w-64 mb-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-700 delay-150">
                    <Image
                        src="/logo_empresa.png"
                        alt="Logo Pampa Baja"
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                        sizes="(max-width: 768px) 100vw, 256px"
                    />
                </div>


                {/* Loader y Mensaje */}
                <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                    <div className="relative flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                        <div className="absolute inset-0 h-10 w-10 border-4 border-blue-500/20 rounded-full"></div>
                    </div>

                    <p className="text-blue-100/60 font-medium text-sm tracking-[0.2em] uppercase">
                        {message}
                    </p>
                </div>
            </div>

            {/* Footer sutil */}
            <div className="absolute bottom-10 text-[10px] text-blue-500/30 font-bold uppercase tracking-[0.3em] animate-in fade-in duration-1000 delay-500">
                by Nos Planet
            </div>
        </div>
    );
}
