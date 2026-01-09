'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react'; // Quitamos Users

const usuariosEjemplo = [
    { id: 1, nombre: 'Jefe SST', usuario: 'jefe', rol: 'Administrador' },
    { id: 2, nombre: 'Juan Perez', usuario: 'juanp', rol: 'Supervisor' },
    { id: 3, nombre: 'Maria Gomez', usuario: 'mariag', rol: 'Auditor' },
];

export default function UsuariosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // CORRECCIÓN: Quitamos el 'setListaUsuarios'
    const [listaUsuarios] = useState(usuariosEjemplo);

    useEffect(() => {
        if (!loading) {
            if (!user || user.rol.toLowerCase() !== 'administrador') {
                alert("Acceso Denegado: Solo administradores.");
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    if (loading) return <div className="p-8">Cargando...</div>;

    if (user?.rol.toLowerCase() !== 'administrador') return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-500">Administra quién tiene acceso al sistema.</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                    <UserPlus size={18} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Nombre Completo</th>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {listaUsuarios.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 font-medium">{u.id}</td>
                                <td className="px-6 py-4 text-gray-900 font-medium">{u.nombre}</td>
                                <td className="px-6 py-4">{u.usuario}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.rol === 'Administrador' ? 'bg-purple-100 text-purple-700' :
                                            u.rol === 'Supervisor' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {u.rol}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}