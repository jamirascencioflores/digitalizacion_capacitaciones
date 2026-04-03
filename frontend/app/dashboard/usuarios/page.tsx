// frontend/app/dashboard/usuarios/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2, X, Save, Shield, User, Lock, Pencil, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/services/api';
import { AxiosError } from 'axios';

interface UsuarioData {
    id_usuario: number;
    nombre: string; // 🟢 CORREGIDO: Antes era nombre_completo, pero el backend devuelve 'nombre'
    usuario: string;
    email?: string;
    rol: string;
    estado: boolean;
}

interface ErrorResponse {
    error: string;
}

export default function UsuariosPage() {
    const { user, loading, actualizarUserSesion } = useAuth();
    const router = useRouter();

    const [listaUsuarios, setListaUsuarios] = useState<UsuarioData[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Estados para Modales Principales
    const [showModal, setShowModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [usuarioAEditar, setUsuarioAEditar] = useState<number | null>(null);

    // 🟢 NUEVO: Estados para Modales de Confirmación (Alertas Profesionales)
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [userToReset, setUserToReset] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: '', // 🟢 CORREGIDO
        usuario: '',
        email: '',
        password: '',
        rol: 'Auditor',
        estado: true
    });

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        rol: 'Supervisor'
    });

    const cargarUsuarios = async () => {
        try {
            const { data } = await api.get('/usuarios');
            setListaUsuarios(data);
        } catch (error) {
            console.error("Error cargando usuarios", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (!user || user.rol.toLowerCase() !== 'administrador') {
                router.push('/dashboard');
            } else {
                cargarUsuarios();
            }
        }
    }, [user, loading, router]);

    const handleFinalInvite = async () => {
        const id = toast.loading("Enviando invitación...");
        try {
            await api.post('/auth/invitar', {
                email: inviteData.email,
                rol: inviteData.rol
            });
            toast.success("¡Invitación enviada con éxito! 📧", { id });
            setShowInviteModal(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Error al procesar la invitación", { id });
        }
    };

    const abrirModalCrear = () => {
        setModoEdicion(false);
        setUsuarioAEditar(null);
        setFormData({ nombre: '', usuario: '', email: '', password: '', rol: 'Auditor', estado: true });
        setShowModal(true);
    };

    const abrirModalEditar = (usuario: any) => {
        setModoEdicion(true);
        setUsuarioAEditar(usuario.id_usuario);
        setFormData({
            nombre: usuario.nombre, // 🟢 CORREGIDO
            usuario: usuario.usuario,
            email: usuario.email || '',
            password: '',
            rol: usuario.rol,
            estado: usuario.estado
        });
        setShowModal(true);
    };

    // 🟢 NUEVO: Lógica confirmación eliminar profesional
    const confirmEliminar = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/usuarios/${userToDelete}`);
            toast.success("Usuario eliminado correctamente 🗑️");
            cargarUsuarios();
        } catch (error) {
            const err = error as AxiosError<ErrorResponse>;
            toast.error(err.response?.data?.error || "Error al eliminar");
        } finally {
            setUserToDelete(null);
        }
    };

    // 🟢 NUEVO: Lógica confirmación reseteo profesional
    const confirmReset = async () => {
        if (!userToReset) return;
        const id = toast.loading("Enviando correo de recuperación...");
        try {
            await api.post('/auth/recuperar', { usuario: userToReset });
            toast.success("Correo enviado con éxito 📧", { id });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al enviar el correo", { id });
        } finally {
            setUserToReset(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.name === 'estado' ? (e.target as HTMLSelectElement).value === 'true' : e.target.value;
        setFormData({ ...formData, [e.target.name]: val });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre || !formData.usuario) {
            toast.error("Nombre y Usuario son obligatorios");
            return;
        }

        try {
            if (modoEdicion && usuarioAEditar) {
                await api.put(`/usuarios/${usuarioAEditar}`, formData);

                if (user?.id_usuario == usuarioAEditar) {
                    actualizarUserSesion({
                        nombre: formData.nombre,
                        usuario: formData.usuario,
                        email: formData.email,
                        rol: formData.rol
                    });
                }
                toast.success("Usuario actualizado correctamente ✅");
            } else {
                await api.post('/usuarios', formData);
                toast.success("Usuario creado con éxito 🎉");
            }
            setShowModal(false);
            cargarUsuarios();
        } catch (error) {
            const err = error as AxiosError<ErrorResponse>;
            toast.error(err.response?.data?.error || "Error al guardar usuario");
        }
    };

    if (loading) return <div className="p-8">Verificando permisos...</div>;
    if (user?.rol.toLowerCase() !== 'administrador') return null;

    return (
        <div className="space-y-6 relative pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
                    <p className="text-gray-500 dark:text-gray-400">Administra quién tiene acceso al sistema.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            setInviteData({ email: '', rol: 'Supervisor' });
                            setShowInviteModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-bold active:scale-95"
                    >
                        <Mail size={18} /> Invitar Colaborador
                    </button>
                    <button
                        onClick={abrirModalCrear}
                        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition font-bold active:scale-95"
                    >
                        <UserPlus size={18} /> Nuevo Usuario
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-hidden">
                    {loadingData ? (
                        <div className="p-8 text-center text-gray-400">Cargando datos...</div>
                    ) : listaUsuarios.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No hay usuarios registrados.</div>
                    ) : (
                        <>
                            {/* VISTA MÓVIL */}
                            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                                {listaUsuarios.map((u, index) => (
                                    <div key={u.id_usuario} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                {/* 🟢 CORREGIDO: Índice en lugar de ID real */}
                                                <span className="font-mono text-gray-400 font-bold text-xs bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded-md self-start mb-1">#{index + 1}</span>
                                                {/* 🟢 CORREGIDO: Muestra nombre correctamente */}
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">{u.nombre}</h4>
                                                <span className="text-gray-500 text-sm">{u.usuario}</span>
                                            </div>
                                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-xl border bg-blue-50 text-blue-700 border-blue-100">{u.rol}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t dark:border-slate-700 pt-3">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-xl border ${u.estado ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                {u.estado ? 'Activo' : 'Inactivo'}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setUserToReset(u.email || u.usuario)} className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><Mail size={16} /></button>
                                                <button onClick={() => abrirModalEditar(u)} className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Pencil size={16} /></button>
                                                <button onClick={() => setUserToDelete(u.id_usuario)} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* VISTA ESCRITORIO */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-xs uppercase text-gray-500 font-bold border-b dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4">N°</th>
                                            <th className="px-6 py-4">Nombre Completo</th>
                                            <th className="px-6 py-4">Usuario</th>
                                            <th className="px-6 py-4">Rol</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-700">
                                        {listaUsuarios.map((u, index) => (
                                            <tr key={u.id_usuario} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                                                {/* 🟢 CORREGIDO: Índice en lugar de ID real */}
                                                <td className="px-6 py-4 font-mono text-gray-400 font-bold">#{index + 1}</td>
                                                {/* 🟢 CORREGIDO: Muestra nombre correctamente */}
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{u.nombre}</td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-300">{u.usuario}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${u.rol === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            u.rol === 'Supervisor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-gray-50 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {u.rol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${u.estado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {u.estado ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setUserToReset(u.email || u.usuario)} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Enviar Recuperación"><Mail size={18} /></button>
                                                        <button onClick={() => abrirModalEditar(u)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Editar"><Pencil size={18} /></button>
                                                        <button onClick={() => setUserToDelete(u.id_usuario)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 🟢 MODAL PROFESIONAL: CONFIRMAR ELIMINAR */}
            {userToDelete !== null && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Eliminar Usuario?</h3>
                            <p className="text-slate-500 text-sm">Esta acción es permanente y todos sus datos de acceso serán borrados. ¿Deseas continuar?</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                            <button onClick={() => setUserToDelete(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={confirmEliminar} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 MODAL PROFESIONAL: CONFIRMAR RESETEO */}
            {userToReset !== null && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Restablecer Acceso</h3>
                            <p className="text-slate-500 text-sm mb-2">Se enviará un correo a <strong>{userToReset}</strong> con un enlace único para cambiar la contraseña.</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                            <button onClick={() => setUserToReset(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={confirmReset} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                Enviar Correo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR/EDITAR (Mantenido intacto) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                {modoEdicion ? <Pencil size={20} className="text-blue-600" /> : <UserPlus size={20} className="text-blue-600" />}
                                {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={18} />
                                    <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full border dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" placeholder="Ej: Juan Perez" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Correo Electrónico</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="ejemplo@correo.com" required={!modoEdicion} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Usuario (Login)</label>
                                    <input type="text" name="usuario" value={formData.usuario} onChange={handleInputChange} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej: jperez" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rol</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                        <select name="rol" value={formData.rol} onChange={handleInputChange} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                            <option value="Administrador">Administrador</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Auditor">Auditor</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {modoEdicion ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Estado</label>
                                    <select name="estado" value={String(formData.estado)} onChange={handleInputChange} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2">
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Contraseña</label>
                                    <div className="relative group/pass">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 dark:text-gray-500">
                                            <Lock size={18} />
                                        </div>
                                        <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ingresa la contraseña" required />
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border dark:border-slate-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex justify-center items-center gap-2"><Save size={18} /> {modoEdicion ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL INVITACIÓN (Mantenido intacto) */}
            {showInviteModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2 dark:text-white"><Mail className="text-blue-600" size={20} /> Invitar Colaborador</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setInviteData({ ...inviteData, rol: 'Supervisor' })} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${inviteData.rol === 'Supervisor' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}><Shield size={20} /><span className="font-bold text-sm">Supervisor</span></button>
                                <button onClick={() => setInviteData({ ...inviteData, rol: 'Auditor' })} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${inviteData.rol === 'Auditor' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}><User size={20} /><span className="font-bold text-sm">Auditor</span></button>
                            </div>
                            <input type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} className="w-full rounded-xl border dark:border-slate-700 dark:bg-slate-900/50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="ejemplo@correo.com" />
                            <button onClick={handleFinalInvite} disabled={!inviteData.email} className="w-full bg-slate-900 dark:bg-blue-600 text-white rounded-xl py-4 font-bold shadow-xl active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">Enviar Invitación <CheckCircle2 size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}