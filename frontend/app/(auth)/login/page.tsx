'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, X, ArrowLeft, ShieldCheck } from 'lucide-react';
import api from '@/services/api';
import { AxiosError } from 'axios';

import AnimatedLoginBackground from '@/components/ui/AnimatedLoginBackground';

type LoginFormInputs = {
  usuario: string;
  contrasena: string;
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormInputs>();
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // 🟢 CORRECCIÓN: Cargar usuario recordado asegurando que el form lo registre
  useEffect(() => {
    const savedUser = localStorage.getItem('rememberUser');
    if (savedUser) {
      setValue('usuario', savedUser, { shouldValidate: true, shouldDirty: true });
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setErrorGlobal(null);
    try {
      // Guardar o eliminar el usuario recordado
      if (rememberMe) {
        localStorage.setItem('rememberUser', data.usuario);
      } else {
        localStorage.removeItem('rememberUser');
      }

      await login(data.usuario, data.contrasena);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400 && data.detalles) {
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
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 relative pt-12">

          {/* 🟢 CORRECCIÓN: Botón de Regresar posicionado de forma elegante */}
          <Link
            href="/"
            className="absolute top-6 left-6 text-slate-400 hover:text-blue-600 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest hover:-translate-x-1"
          >
            <ArrowLeft size={14} strokeWidth={3} /> Volver al Inicio
          </Link>

          <div className="mb-8 text-center mt-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-5 transform rotate-3">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bienvenido de nuevo</h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">Ingresa a tu cuenta para gestionar el sistema</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* INPUT USUARIO O CORREO */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">USUARIO O CORREO</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="admin"
                  {...register('usuario', { required: 'El usuario es obligatorio' })}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-colors autofill:shadow-[inset_0_0_0_1000px_white] autofill:text-slate-700"
                />
              </div>
              {errors.usuario && <span className="text-xs font-medium text-red-500 ml-1">{errors.usuario.message}</span>}
            </div>

            {/* INPUT CONTRASEÑA */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">CONTRASEÑA</label>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register('contrasena', { required: 'La contraseña es obligatoria' })}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 py-3 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm transition-colors autofill:shadow-[inset_0_0_0_1000px_white] autofill:text-slate-700"
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

            <div className="flex justify-between items-center px-1">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 rounded border-2 border-slate-300 bg-white checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <CheckCircle2 size={10} className="absolute text-white hidden peer-checked:block pointer-events-none" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors uppercase tracking-tight">Recordar</span>
              </label>

              <button
                type="button"
                onClick={() => { setShowModal(true); setRecoveryStatus('idle'); setRecoveryUser(''); }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-all hover:translate-x-1 active:scale-95 uppercase tracking-tight"
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

        {/* PARCHE DEFINITIVO PARA AUTOFILL (EVITAR LETRAS BLANCAS) */}
        <style dangerouslySetInnerHTML={{
          __html: `
            input:-webkit-autofill,
            input:-webkit-autofill:hover, 
            input:-webkit-autofill:focus, 
            input:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 1000px white inset !important;
                -webkit-text-fill-color: #334155 !important;
                transition: background-color 5000s ease-in-out 0s;
            }
        `}} />
      </div>

      {/* MODAL DE RECUPERACIÓN - Refinado con Animación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">

            {/* Cabecera Limpia */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Recuperar Acceso</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-8 min-h-[300px] flex flex-col justify-center">
              {recoveryStatus === 'loading' ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                  <h4 className="mt-6 text-lg font-bold text-slate-800">Procesando solicitud</h4>
                  <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">
                    Estamos validando tus datos. <br />
                    Un momento, por favor...
                  </p>
                </div>
              ) : recoveryStatus === 'success' ? (
                <div className="text-center py-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-500 mb-6 border border-green-100 outline outline-4 outline-green-50/50">
                    <CheckCircle2 size={32} />
                  </div>

                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">¡Solicitud Enviada!</h4>
                  <p className="text-slate-500 mt-3 text-sm leading-relaxed px-4">
                    Si <span className="text-slate-900 font-semibold">{recoveryUser}</span> está en nuestra base de datos, recibirás un correo en breve.
                  </p>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-8 flex items-center gap-3 text-left">
                    <AlertCircle size={20} className="text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-700 font-medium leading-tight">
                      Revisa tu bandeja de entrada y spam. El enlace es válido por 60 minutos.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-8 w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Entendido, Volver
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit}>
                  <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
                    Ingresa tu usuario o correo electrónico y te enviaremos una clave temporal o enlace de recuperación.
                  </p>

                  <div className="space-y-2 mb-8">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tu Identificación</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        autoFocus
                        value={recoveryUser}
                        onChange={(e) => setRecoveryUser(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-slate-800 font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        placeholder="Ej. usuario@empresa.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!recoveryUser}
                    className={`w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98] ${!recoveryUser ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                  >
                    Enviar Solicitud de Recuperación
                  </button>

                  {recoveryStatus === 'error' && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                      <AlertCircle size={20} className="shrink-0" />
                      <p className="text-xs font-bold leading-tight">
                        Este usuario o correo no existe. Por favor, verifica tus datos.
                      </p>
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