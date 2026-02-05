'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // 🟢 1. Importamos Link
import { useAuth } from '@/context/AuthContext';
// 🟢 2. Agregamos ArrowLeft a los iconos
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2, X, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { AxiosError } from 'axios';

type LoginFormInputs = {
  usuario: string;
  contrasena: string;
};

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
      let msg = 'Error de conexión';

      if (err instanceof AxiosError && err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setErrorGlobal(msg);
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
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-white/50 relative">

        {/* 🟢 3. BOTÓN PARA VOLVER AL INICIO */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Capacitación</h1>
          <p className="mt-2 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* INPUT USUARIO */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Usuario</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="Usuario"
                {...register('usuario', { required: 'El usuario es obligatorio' })}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            {errors.usuario && <span className="text-xs text-red-500 mt-1 block">{errors.usuario.message}</span>}
          </div>

          {/* INPUT CONTRASEÑA */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register('contrasena', { required: 'La contraseña es obligatoria' })}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.contrasena && <span className="text-xs text-red-500 mt-1 block">{errors.contrasena.message}</span>}

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowModal(true); setRecoveryStatus('idle'); setRecoveryUser(''); }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          {errorGlobal && (
            <div className="rounded-lg bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700 border border-red-100 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={18} />
              {errorGlobal}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {loading ? 'Validando...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>

      {/* MODAL DE RECUPERACIÓN (Se mantiene igual) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Recuperar Acceso</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
            </div>

            <div className="p-6">
              {recoveryStatus === 'success' ? (
                <div className="text-center py-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">¡Solicitud Enviada!</h4>
                  <p className="text-gray-500 mt-2 text-sm">El administrador ha recibido tu alerta. Se pondrán en contacto contigo pronto.</p>
                  <button onClick={() => setShowModal(false)} className="mt-6 w-full py-2 bg-gray-100 rounded-lg font-medium text-gray-700 hover:bg-gray-200">Cerrar</button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit}>
                  <p className="text-sm text-gray-600 mb-4">Ingresa tu usuario. Enviaremos una alerta al administrador para que restablezca tu clave.</p>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tu Usuario</label>
                  <input
                    autoFocus
                    value={recoveryUser}
                    onChange={(e) => setRecoveryUser(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Ej. 12345678"
                  />
                  <button
                    type="submit"
                    disabled={recoveryStatus === 'loading' || !recoveryUser}
                    className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {recoveryStatus === 'loading' ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}