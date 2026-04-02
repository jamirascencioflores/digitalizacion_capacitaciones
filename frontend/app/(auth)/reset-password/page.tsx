'use client';

import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/services/api';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, User, Mail, AtSign } from 'lucide-react';
import AnimatedLoginBackground from '@/components/ui/AnimatedLoginBackground';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const inviteToken = searchParams.get('inviteToken');

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [nombre, setNombre] = useState('');
    // 🟢 NUEVO: Estado para el nombre de usuario
    const [usuario, setUsuario] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [invitedEmail, setInvitedEmail] = useState('');

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            nombre: '',
            password: '',
            confirmPassword: ''
        }
    });

    const [countdown, setCountdown] = useState(4);

    useEffect(() => {
        const verify = async () => {
            if (!token && !inviteToken) return;
            try {
                const url = inviteToken
                    ? `/auth/verificar-token?inviteToken=${inviteToken}`
                    : `/auth/verificar-token?token=${token}`;
                const { data } = await api.get(url);
                setInvitedEmail(data.email);
                if (data.nombre) {
                    setNombre(data.nombre);
                    setValue('nombre', data.nombre);
                }
            } catch (error) {
                console.error("Token inválido", error);
            }
        };
        verify();
    }, [token, inviteToken, setValue]);

    // 🟢 NUEVO: Manejo correcto de la redirección al terminar la cuenta regresiva
    useEffect(() => {
        if (status === 'success' && countdown === 0) {
            router.push('/login');
        }
    }, [countdown, status, router]);

    const onSubmit = async (data: any) => {
        if (!token && !inviteToken) return;
        setLoading(true);
        setStatus('idle');
        try {
            await api.post('/auth/reset-password', {
                token,
                inviteToken,
                password: data.password,
                nombre: data.nombre,
                usuario: usuario // 🟢 Se envía el usuario elegido
            });

            setCurrentStep(3); // Ir al paso de éxito
            setStatus('success');

            // 🟢 MODIFICADO: Solo restamos el contador, la redirección la hace el useEffect
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (error: any) {
            setStatus('error');
            setErrorMsg(error.response?.data?.error || 'Error al completar el registro');
        } finally {
            setLoading(false);
        }
    };

    if (!token && !inviteToken) {
        return (
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 text-center max-w-sm mx-auto">
                <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100/50">
                    <AlertCircle size={40} />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Enlace Inválido</h1>
                <p className="text-slate-500 mt-2 text-sm">El enlace no existe o ya expiró.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                    Volver al Login
                </button>
            </div>
        );
    }

    if (currentStep === 3) {
        return (
            <div className="bg-white/95 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/60 text-center max-w-md mx-auto animate-in zoom-in-95 duration-500 relative overflow-hidden">
                <div className="relative z-10 text-center flex flex-col items-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500 mb-8 border border-green-100/50 shadow-inner">
                        <CheckCircle2 size={40} className="animate-bounce" />
                    </div>

                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-4">¡Registro Completo!</h1>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Tu cuenta ha sido configurada con éxito. En unos momentos serás redirigido al inicio de sesión.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center w-full">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">REDIRIGIENDO EN</div>
                        <div className="text-3xl font-black text-blue-600">{countdown}</div>
                    </div>

                    <button
                        onClick={() => router.push('/login')}
                        className="mt-8 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        Entrar ahora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md relative z-20">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 relative animate-in fade-in slide-in-from-bottom-4">

                {/* Stepper Visual Mejorado: 3 Pasos */}
                <div className="flex items-center justify-center gap-4 mb-10">
                    <div className="flex flex-col items-center gap-1.5 group cursor-default">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-sm border-2 ${currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {currentStep > 1 ? <CheckCircle2 size={16} /> : "1"}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-300'}`}>Perfil</span>
                    </div>

                    <div className={`h-[2px] w-10 transition-colors duration-500 mb-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-100'}`} />

                    <div className="flex flex-col items-center gap-1.5 group cursor-default">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-sm border-2 ${currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {currentStep > 2 ? <CheckCircle2 size={16} /> : "2"}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-300'}`}>Seguridad</span>
                    </div>

                    <div className={`h-[2px] w-10 transition-colors duration-500 mb-4 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-100'}`} />

                    <div className="flex flex-col items-center gap-1.5 group cursor-default">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shadow-sm border-2 ${currentStep >= 3 ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {currentStep === 3 ? <CheckCircle2 size={16} /> : "3"}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= 3 ? 'text-blue-600' : 'text-slate-300'}`}>Listo</span>
                    </div>
                </div>


                <div className="mb-8 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg mb-5 transform rotate-3">
                        <User size={28} />
                    </div>
                    {invitedEmail && (
                        <div className="mb-2 inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 animate-in fade-in duration-500">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter flex items-center gap-1.5">
                                <Mail size={10} /> {invitedEmail}
                            </span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Completa tu Registro</h1>

                    <p className="mt-2 text-sm text-slate-500 font-medium">Sigue los pasos para activar tu cuenta</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ej: Juan Perez"
                                        {...register('nombre', { required: 'El nombre es obligatorio' })}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                                    />
                                </div>
                                {errors.nombre && <span className="text-xs font-medium text-red-500 ml-1">{errors.nombre.message as string}</span>}
                            </div>

                            {/* 🟢 NUEVO: Input de Nombre de Usuario (Solo visible si es invitación) */}
                            {inviteToken && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex justify-between">
                                        Nombre de Usuario
                                        <span className="text-[10px] text-slate-400 normal-case font-medium">Usado para iniciar sesión</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                            <AtSign size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: jperez"
                                            value={usuario}
                                            onChange={(e) => setUsuario(e.target.value.trim().toLowerCase())}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white lowercase"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={async () => {
                                    const val = watch('nombre');
                                    // 🟢 Modificado: Obliga a llenar el usuario si es invitación
                                    if (val && (!inviteToken || usuario.trim() !== '')) setCurrentStep(2);
                                }}
                                className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                            >
                                Siguiente Paso
                            </button>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                                {errors.password && <span className="text-xs font-medium text-red-500 ml-1">{errors.password.message as string}</span>}
                            </div>

                            {/* REPETIR CLAVE */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        {...register('confirmPassword', {
                                            required: 'Repite la contraseña',
                                            validate: (val) => val === watch('password') || 'Las contraseñas no coinciden'
                                        })}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <span className="text-xs font-medium text-red-500 ml-1">{errors.confirmPassword.message as string}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-80' : ''}`}
                            >
                                {loading ? 'Finalizando...' : 'Completar Registro 🚀'}
                            </button>
                            <button type="button" onClick={() => setCurrentStep(1)} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Atrás</button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="rounded-xl bg-red-50 p-3 flex items-start gap-3 text-sm text-red-600 border border-red-100 italic">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span className="font-medium">{errorMsg}</span>
                        </div>
                    )}
                </form>
            </div>
            <p className="text-center text-slate-400/80 text-xs mt-6">
                &copy; {new Date().getFullYear()} Nos Planet SAC. Todos los derechos reservados.
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