// frontend/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import api from '@/services/api';
import { AxiosError } from 'axios'; // 🟢 1. Importamos AxiosError para tipado estricto

type LoginFormInputs = {
  usuario: string;
  contrasena: string;
};

import AnimatedLoginBackground from '@/components/ui/AnimatedLoginBackground';

// ... imports ...

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setErrorGlobal(null);
    try {
      await login(data.usuario, data.contrasena);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400 && data.detalles) {
          // Errores de validación de Zod
          const validationMsg = data.detalles.map((d: any) => d.mensaje).join(', ');
          setErrorGlobal(`Validación: ${validationMsg}`);
        } else if (status === 401) {
          setErrorGlobal('Usuario o contraseña incorrectos. Por favor, verifica tus credenciales.');
        } else if (status === 403) {
          setErrorGlobal('Tu cuenta está inactiva. Contacta al administrador.');
        } else if (status === 500) {
          setErrorGlobal('Error interno del servidor. Inténtalo más tarde.');
        } else {
          setErrorGlobal(data.error || 'Ocurrió un error inesperado.');
        }
      } else {
        setErrorGlobal('No se pudo conectar con el servidor. Verifica tu internet.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRecoverySubmit = async (e: React.FormEvent) => {
    // ... handleRecoverySubmit logic ...
    e.preventDefault();
    if (!recoveryUser) return;

    setRecoveryStatus('loading');
    try {
      await api.post('/auth/recuperar', { usuario: recoveryUser });
      setRecoveryStatus('success');
    } catch {
      setRecoveryStatus('error');
    }
  };

  return (
    <AnimatedLoginBackground>


      <div className="w-full max-w-md relative z-20">

        {/* Tarjeta Glassmorphism Profesional */}
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 relative">

          {/* Botón de Regresar (Dentro del Card) */}
          <button
            onClick={() => router.push('/')}
            className="absolute top-4 left-4 flex items-center gap-2 p-2 px-3 text-slate-500 hover:text-blue-700 hover:bg-blue-50/80 rounded-full transition-all group font-medium text-sm"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al sitio</span>
          </button>

          <div className="mb-8 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-5 transform rotate-3">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bienvenido de nuevo</h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">Ingresa a tu cuenta para gestionar el sistema</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* INPUT USUARIO - Diseño Clean */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Ej. admin"
                  {...register('usuario', { required: 'El usuario es obligatorio' })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                />
              </div>
              {errors.usuario && <span className="text-xs font-medium text-red-500 ml-1">{errors.usuario.message}</span>}
            </div>

            {/* INPUT CONTRASEÑA - Diseño Clean */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('contrasena', { required: 'La contraseña es obligatoria' })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.contrasena && <span className="text-xs font-medium text-red-500 ml-1">{errors.contrasena.message}</span>}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowModal(true); setRecoveryStatus('idle'); setRecoveryUser(''); }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {errorGlobal && (
              <div className="rounded-xl bg-red-50 p-3 flex items-start gap-3 text-sm text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="font-medium">{errorGlobal}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] ${loading ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400/80 text-xs mt-6">
          &copy; {new Date().getFullYear()} FormApp Inc. Todos los derechos reservados.
        </p>

      </div>

      {/* MODAL DE RECUPERACIÓN */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Recuperar Acceso</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
            </div>

            <div className="p-6 min-h-[280px] flex flex-col justify-center">
              {recoveryStatus === 'loading' ? (
                <div className="flex flex-col items-center justify-center py-8 animate-in mt-fade-in zoom-in-95 duration-300">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-blue-50/50 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <h4 className="mt-6 text-lg font-bold text-slate-800">Procesando...</h4>
                  <p className="mt-2 text-sm text-slate-500 text-center">
                    Estamos validando tu información y <br /> preparando el correo de recuperación.
                  </p>
                </div>
              ) : recoveryStatus === 'success' ? (
                <div className="text-center py-6 animate-in zoom-in-95 duration-300">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500 mb-6 shadow-sm border border-green-100/50">
                    <CheckCircle2 size={40} className="animate-bounce" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">¡Solicitud Enviada!</h4>
                  <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                    Si el usuario <span className="font-semibold text-slate-700">&quot;{recoveryUser}&quot;</span> está registrado, hemos enviado un enlace a su correo para restablecer la contraseña.
                  </p>
                  <div className="bg-blue-50/50 rounded-xl p-4 mt-6 border border-blue-100/50">
                    <p className="text-xs text-blue-700 font-medium">
                      Revisa tu bandeja de entrada y la carpeta de spam.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    Volver al Inicio
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit}>
                  <p className="text-sm text-slate-600 mb-6 font-medium">
                    Ingresa tu usuario o correo electrónico para recibir las instrucciones de recuperación.
                  </p>

                  <div className="space-y-1.5 mb-6">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tu Identificación</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <User size={16} />
                      </div>
                      <input
                        autoFocus
                        value={recoveryUser}
                        onChange={(e) => setRecoveryUser(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        placeholder="Usuario o correo@ejemplo.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!recoveryUser}
                    className={`w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-[0.98] ${!recoveryUser ? 'opacity-50 cursor-not-allowed grayscale' : ''
                      }`}
                  >
                    Enviar Solicitud
                  </button>

                  {recoveryStatus === 'error' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 animate-in slide-in-from-top-2">
                      <AlertCircle size={16} />
                      <p className="text-xs font-semibold">Algo salió mal. Inténtalo de nuevo.</p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AnimatedLoginBackground>
  );
}