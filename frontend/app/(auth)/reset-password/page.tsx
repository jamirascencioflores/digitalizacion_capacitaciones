'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import AnimatedLoginBackground from '@/components/ui/AnimatedLoginBackground';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            password: '',
            confirmPassword: ''
        }
    });

    const [countdown, setCountdown] = useState(4);

    const onSubmit = async (data: any) => {
        if (!token) return;
        setLoading(true);
        setStatus('idle');
        try {
            await api.post('/auth/reset-password', {
                token,
                password: data.password
            });
            setStatus('success');

            // Iniciar contador
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        router.push('/login');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (error: any) {
            setStatus('error');
            setErrorMsg(error.response?.data?.error || 'Error al restablecer contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 text-center max-w-sm mx-auto">
                <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100/50">
                    <AlertCircle size={40} />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Enlace Inválido</h1>
                <p className="text-slate-500 mt-2 text-sm">El token de recuperación no existe, ha expirado o ya fue utilizado.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                    Volver al Login
                </button>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="bg-white/95 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/60 text-center max-w-md mx-auto animate-in zoom-in-95 duration-500 relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent" />

                <div className="relative z-10">
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-50 text-green-500 mb-8 shadow-inner border border-green-100/50 relative">
                        <CheckCircle2 size={48} className="animate-bounce" />
                        <div className="absolute inset-x-0 bottom-0 flex justify-center translate-y-2">
                            <div className="px-3 py-1 bg-white border border-green-100 rounded-full shadow-sm">
                                <span className="text-xs font-bold text-green-600">SISTEMA OK</span>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">¡Todo listo!</h1>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Tu contraseña ha sido actualizada con éxito. Por seguridad, te redirigiremos para que inicies sesión.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Redirigiendo en</div>
                        <div className="relative">
                            <svg className="w-16 h-16 transform -rotate-90">
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    className="text-slate-200"
                                />
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    strokeDasharray={176}
                                    strokeDashoffset={176 - (176 * (4 - countdown)) / 4}
                                    className="text-blue-500 transition-all duration-1000 ease-linear"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-slate-800">{countdown}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/login')}
                        className="mt-8 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        ¿No quieres esperar? Haz clic aquí
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md relative z-20">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 relative animate-in fade-in slide-in-from-bottom-4">

                <button
                    onClick={() => router.push('/login')}
                    className="absolute top-4 left-4 flex items-center gap-2 p-2 px-3 text-slate-500 hover:text-blue-700 hover:bg-blue-50/80 rounded-full transition-all group font-medium text-sm"
                >
                    <ArrowLeft size={18} />
                    <span>Volver</span>
                </button>

                <div className="mb-8 text-center mt-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-5 transform rotate-3">
                        <Lock size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nueva Contraseña</h1>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Crea una contraseña segura para tu cuenta</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* INPUT NUEVA CLAVE */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña Nueva</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register('password', {
                                    required: 'La contraseña es obligatoria',
                                    minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                                })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="text-xs font-medium text-red-500 ml-1">{errors.password.message}</span>}
                    </div>

                    {/* REPETIR CLAVE */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register('confirmPassword', {
                                    required: 'Repite la contraseña',
                                    validate: (val) => val === watch('password') || 'Las contraseñas no coinciden'
                                })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                                placeholder="••••••••"
                            />
                        </div>
                        {errors.confirmPassword && <span className="text-xs font-medium text-red-500 ml-1">{errors.confirmPassword.message}</span>}
                    </div>

                    {status === 'error' && (
                        <div className="rounded-xl bg-red-50 p-3 flex items-start gap-3 text-sm text-red-600 border border-red-100 italic animate-in shake-1">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span className="font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-80' : ''}`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={18} />
                                <span>Actualizando...</span>
                            </div>
                        ) : 'Actualizar Contraseña'}
                    </button>
                </form>
            </div>
            <p className="text-center text-slate-400/80 text-xs mt-6">
                &copy; {new Date().getFullYear()} FormApp Inc. Todos los derechos reservados.
            </p>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <AnimatedLoginBackground>
            <Suspense fallback={<div className="text-white">Cargando...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </AnimatedLoginBackground>
    );
}
