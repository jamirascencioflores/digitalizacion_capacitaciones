// frontend/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';


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


  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setErrorGlobal(null);
    try {
      await login(data.usuario, data.contrasena);
      router.push('/dashboard');
    } catch (err: unknown) {
      // CORRECCIÓN AQUÍ: Convertimos el error a string de forma segura
      if (typeof err === 'string') {
        setErrorGlobal(err);
      } else if (err instanceof Error) {
        setErrorGlobal(err.message);
      } else {
        setErrorGlobal('Error desconocido al intentar ingresar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Sistema de Capacitación
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Accede a tu plataforma de aprendizaje
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Usuario</label>
            <input
              type="text"
              placeholder="Tu nombre de usuario"
              {...register('usuario', { required: 'El usuario es obligatorio' })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.usuario && <span className="text-xs text-red-500">{errors.usuario.message}</span>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              placeholder="Tu contraseña"
              {...register('contrasena', { required: 'La contraseña es obligatoria' })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.contrasena && <span className="text-xs text-red-500">{errors.contrasena.message}</span>}
            <div className="mt-1 flex justify-end">
              <Link href="#" className="text-sm font-medium text-blue-500 hover:text-blue-600">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {errorGlobal && (
            <div className="rounded bg-red-50 p-3 text-center text-sm text-red-600">
              {errorGlobal}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg bg-blue-500 px-4 py-2.5 font-bold text-white transition hover:bg-blue-600 ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}