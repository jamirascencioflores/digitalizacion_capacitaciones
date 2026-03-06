'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ShieldAlert, Eye, EyeOff, Save, Loader2, LogOut } from 'lucide-react';
import AnimatedLoginBackground from '@/components/ui/AnimatedLoginBackground';

export default function ChangePasswordPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            password: '',
            confirmPassword: ''
        }
    });

    // Si no hay usuario o no necesita reset, lo sacamos
    useEffect(() => {
        if (!user) {
            router.push('/login');
        } else if (!user.solicita_reset) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const onSubmit = async (data: any) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            await api.post(`/usuarios/reset/${user.id_usuario}`, {
                nuevaContrasena: data.password
            });

            // Forzamos relogin por seguridad para que el token se refresque con el nuevo estado
            alert("Contraseña actualizada con éxito. Por seguridad, inicia sesión nuevamente.");
            logout();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al actualizar contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <AnimatedLoginBackground>
            <div className="w-full max-w-md bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50">
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4 animate-pulse">
                        <ShieldAlert size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Cambio Obligatorio</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Estás usando una contraseña temporal. Por seguridad, debes crear una nueva contraseña para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register('password', {
                                    required: 'La contraseña es obligatoria',
                                    minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                                })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 transition-all"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            {...register('confirmPassword', {
                                required: 'Repite la contraseña',
                                validate: (val) => val === watch('password') || 'Las contraseñas no coinciden'
                            })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 transition-all"
                            placeholder="Repite tu nueva contraseña"
                        />
                        {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword.message}</span>}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar y Continuar
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                            <LogOut size={16} /> Cerrar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </AnimatedLoginBackground>
    );
}
