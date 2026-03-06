// frontend/app/dashboard/loading.tsx
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-in fade-in duration-500">
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Loader2 size={48} className="text-blue-500 animate-spin relative z-10" />
                </div>
                <p className="text-blue-900/70 font-bold tracking-widest uppercase text-sm animate-pulse">
                    Cargando Módulo...
                </p>
            </div>
        </div>
    );
}
