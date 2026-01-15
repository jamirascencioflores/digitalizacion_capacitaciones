// frontend/app/dashboard/usuarios/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2, X, Save, Shield, User, Lock, Pencil } from 'lucide-react';
import api from '@/services/api';
import { AxiosError } from 'axios';

interface UsuarioData {
    id_usuario: number;
    nombre_completo: string;
    usuario: string;
    rol: string;
    estado: boolean;
}

interface ErrorResponse {
    error: string;
}

export default function UsuariosPage() {
    // 1. 🟢 IMPORTAMOS 'actualizarUserSesion' y 'user'
    const { user, loading, actualizarUserSesion } = useAuth();
    const router = useRouter();

    const [listaUsuarios, setListaUsuarios] = useState<UsuarioData[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [usuarioAEditar, setUsuarioAEditar] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        nombre_completo: '',
        usuario: '',
        password: '',
        rol: 'Auditor',
        estado: true
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

    const abrirModalCrear = () => {
        setModoEdicion(false);
        setUsuarioAEditar(null);
        setFormData({ nombre_completo: '', usuario: '', password: '', rol: 'Auditor', estado: true });
        setShowModal(true);
    };

    const abrirModalEditar = (usuario: UsuarioData) => {
        setModoEdicion(true);
        setUsuarioAEditar(usuario.id_usuario);
        setFormData({
            nombre_completo: usuario.nombre_completo,
            usuario: usuario.usuario,
            password: '',
            rol: usuario.rol,
            estado: usuario.estado
        });
        setShowModal(true);
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.")) return;

        try {
            await api.delete(`/usuarios/${id}`);
            alert("Usuario eliminado correctamente 🗑️");
            cargarUsuarios();
        } catch (error) {
            const err = error as AxiosError<ErrorResponse>;
            alert(err.response?.data?.error || "Error al eliminar");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.name === 'estado' ? (e.target as HTMLSelectElement).value === 'true' : e.target.value;
        setFormData({ ...formData, [e.target.name]: val });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre_completo || !formData.usuario) {
            alert("Nombre y Usuario son obligatorios");
            return;
        }
        if (!modoEdicion && !formData.password) {
            alert("La contraseña es obligatoria para nuevos usuarios");
            return;
        }

        try {
            if (modoEdicion && usuarioAEditar) {
                // --- MODO EDITAR (PUT) ---
                await api.put(`/usuarios/${usuarioAEditar}`, formData);

                // 🟢 CORRECCIÓN 1 y 2: Acceso seguro al ID sin 'any' y sin 'id' inexistente
                // Como 'user' es de tipo 'Usuario', solo accedemos a las propiedades que existen en ese tipo
                const idSesion = user?.id_usuario;

                console.log("🆔 ID Detectado en Sesión:", idSesion);
                console.log("✏️ ID Editado:", usuarioAEditar);

                // 2. Comparación flexible (==)
                if (idSesion == usuarioAEditar) {
                    console.log("✅ ¡MATCH! Actualizando...");

                    // 🟢 CORRECCIÓN 3: Solo enviamos propiedades que existen en el tipo 'Usuario'
                    actualizarUserSesion({
                        nombre: formData.nombre_completo, // Mapeamos 'nombre_completo' -> 'nombre'
                        usuario: formData.usuario,
                        rol: formData.rol
                    });
                } else {
                    console.log("❌ No coinciden los IDs o no se encontró ID en sesión.");
                }

                alert("Usuario actualizado correctamente ✅");
            } else {
                // --- MODO CREAR (POST) ---
                await api.post('/usuarios', formData);
                alert("Usuario creado con éxito 🎉");
            }

            setShowModal(false);
            cargarUsuarios();
        } catch (error) {
            const err = error as AxiosError<ErrorResponse>;
            alert(err.response?.data?.error || "Error al guardar usuario");
        }
    };
    if (loading) return <div className="p-8">Verificando permisos...</div>;
    if (user?.rol.toLowerCase() !== 'administrador') return null;

    return (
        <div className="space-y-6 relative pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-500">Administra quién tiene acceso al sistema.</p>
                </div>
                <button
                    onClick={abrirModalCrear}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                >
                    <UserPlus size={18} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Nombre Completo</th>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingData ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Cargando datos...</td></tr>
                            ) : listaUsuarios.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay usuarios registrados.</td></tr>
                            ) : listaUsuarios.map((u) => (
                                <tr key={u.id_usuario} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium text-gray-400">#{u.id_usuario}</td>
                                    <td className="px-6 py-4 text-gray-900 font-bold">{u.nombre_completo}</td>
                                    <td className="px-6 py-4">{u.usuario}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full border ${u.rol === 'Administrador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            u.rol === 'Supervisor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${u.estado ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.estado ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {u.estado ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => abrirModalEditar(u)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => handleEliminar(u.id_usuario)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                {modoEdicion ? <><Pencil size={20} className="text-blue-600" /> Editar Usuario</> : <><UserPlus size={20} className="text-blue-600" /> Nuevo Usuario</>}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="nombre_completo"
                                        value={formData.nombre_completo}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Juan Perez"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (Login)</label>
                                    <input
                                        type="text"
                                        name="usuario"
                                        value={formData.usuario}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="ej: jperez"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <select
                                            name="rol"
                                            value={formData.rol}
                                            onChange={handleInputChange}
                                            className="w-full border rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                        >
                                            <option value="Administrador">Administrador</option>
                                            <option value="Supervisor">Supervisor</option>
                                            <option value="Auditor">Auditor</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {modoEdicion && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        name="estado"
                                        value={String(formData.estado)}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                                    Contraseña
                                    {modoEdicion && <span className="text-xs text-gray-400 font-normal">(Dejar en blanco para mantener actual)</span>}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={modoEdicion ? "••••••••" : "Contraseña requerida"}
                                        required={!modoEdicion}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow transition flex justify-center items-center gap-2"
                                >
                                    <Save size={18} /> {modoEdicion ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}