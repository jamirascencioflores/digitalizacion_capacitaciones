// frontend/app/dashboard/alertas/page.tsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, User, X, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Solicitud {
    id_usuario: number;
    usuario: string; // DNI
    nombre: string;
    rol: string;
}

export default function AlertasPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);

    // ESTADOS PARA EL MODAL
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Solicitud | null>(null);
    const [nuevaClave, setNuevaClave] = useState('');

    // Protección: Solo Admin
    useEffect(() => {
        if (user && user.rol?.toLowerCase() !== 'administrador') {
            router.push('/dashboard');
        }
    }, [user, router]);

    const cargarSolicitudes = async () => {
        try {
            const { data } = await api.get('/usuarios/solicitudes');
            setSolicitudes(data);
        } catch (error) {
            console.error("Error cargando alertas", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarSolicitudes();
    }, []);

    // 1. Abrir Modal
    const abrirModal = (usuario: Solicitud) => {
        setUsuarioSeleccionado(usuario);
        setNuevaClave(''); // Limpiar input
    };

    // 2. Cerrar Modal
    const cerrarModal = () => {
        setUsuarioSeleccionado(null);
        setNuevaClave('');
    };

    // 3. Confirmar cambio
    const confirmarReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioSeleccionado) return;

        setProcesando(true);
        try {
            // Enviamos la nueva clave (si está vacía, el backend usará el DNI)
            await api.post(`/usuarios/reset/${usuarioSeleccionado.id_usuario}`, {
                nuevaContrasena: nuevaClave
            });

            alert(`✅ Contraseña de ${usuarioSeleccionado.nombre} actualizada con éxito.`);
            cargarSolicitudes();
            cerrarModal();
        } catch (error) {
            console.error("Error al resetear clave:", error);
            alert("❌ Error al actualizar. Intenta nuevamente.");
        } finally {
            setProcesando(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Cargando alertas...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative">
            <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <ShieldAlert size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Centro de Alertas</h1>
                    <p className="text-gray-500 text-sm">Usuarios que han solicitado recuperación de contraseña</p>
                </div>
            </div>

            {solicitudes.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-bold text-green-800">Todo en orden</h3>
                    <p className="text-green-600">No hay solicitudes pendientes en este momento.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {solicitudes.map((sol) => (
                        <div key={sol.id_usuario} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{sol.nombre}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className="font-mono bg-gray-100 px-2 rounded">DNI: {sol.usuario}</span>
                                        <span>•</span>
                                        <span className="capitalize">{sol.rol}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full flex items-center gap-1 border border-orange-100">
                                    <AlertCircle size={14} /> Solicita Reset
                                </div>

                                <button
                                    onClick={() => abrirModal(sol)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                                >
                                    <KeyRound size={18} />
                                    Gestionar Clave
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- MODAL DE CAMBIO DE CONTRASEÑA --- */}
            {usuarioSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Cabecera Modal */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Restablecer Contraseña</h3>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cuerpo Modal */}
                        <form onSubmit={confirmarReset} className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Estás cambiando la clave para: <span className="font-bold text-gray-900">{usuarioSeleccionado.nombre}</span>
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 text-[12px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    placeholder={`Dejar vacío para usar el usuario como contraseña (${usuarioSeleccionado.usuario})`}
                                    value={nuevaClave}
                                    onChange={(e) => setNuevaClave(e.target.value)}
                                    autoFocus
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    * Si dejas este campo vacío, el usuario y la contraseña serán lo mismo.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={cerrarModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesando}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2 transition"
                                >
                                    {procesando ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    Confirmar Cambio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}