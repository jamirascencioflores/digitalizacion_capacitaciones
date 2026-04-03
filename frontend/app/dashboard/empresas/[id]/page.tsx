// frontend/app/dashboard/empresas/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Users, FileText, ShieldCheck, ShieldAlert, Mail, Calendar,
    Search, UserPlus, Building2, X, ChevronRight, Pencil, Trash2, Save, Lock, User, CheckCircle2
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

export default function DetalleEmpresaPage() {
    const { id } = useParams();
    const router = useRouter();

    // ESTADOS GENERALES
    const [loading, setLoading] = useState(true);
    const [empresa, setEmpresa] = useState<any>(null);
    const [usuarios, setUsuarios] = useState([]);
    const [filtro, setFiltro] = useState("");

    // ESTADOS PARA MODALES DE ACCIÓN
    const [showModalInvitacion, setShowModalInvitacion] = useState(false);
    const [showModalEditar, setShowModalEditar] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);
    const [userToReset, setUserToReset] = useState<string | null>(null);

    // FORMULARIOS
    const [invitacion, setInvitacion] = useState({ rol: 'Administrador', email: '' });
    const [enviando, setEnviando] = useState(false);
    const [usuarioAEditar, setUsuarioAEditar] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        usuario: '',
        email: '',
        rol: 'Auditor',
        estado: true
    });

    const cargarDatos = useCallback(async () => {
        try {
            const [resEmpresa, resUsuarios] = await Promise.all([
                api.get(`/dashboard/saas/empresas/${id}`),
                api.get(`/dashboard/saas/empresas/${id}/usuarios`)
            ]);
            setEmpresa(resEmpresa.data);
            setUsuarios(resUsuarios.data);
        } catch (error) {
            console.error("Error cargando detalles:", error);
            toast.error("No se pudieron cargar los datos de la empresa.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // --- ACCIONES DE EMPRESA ---
    const handleToggleEstado = async () => {
        const accion = empresa.estado ? 'suspender' : 'activar';
        try {
            await api.patch(`/dashboard/saas/empresas/${id}/toggle`, { estado: !empresa.estado });
            setEmpresa({ ...empresa, estado: !empresa.estado });
            toast.success(`Empresa ${empresa.estado ? 'suspendida' : 'activada'} correctamente.`);
        } catch (error) {
            toast.error("Error al cambiar el estado de la empresa.");
        }
    };

    // --- ACCIONES DE USUARIO ---
    const handleInvitarUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        const toastId = toast.loading("Enviando invitación...");
        try {
            await api.post('/auth/invitar', {
                email: invitacion.email,
                rol: invitacion.rol,
                id_empresa: Number(id)
            });
            setShowModalInvitacion(false);
            setInvitacion({ rol: 'Administrador', email: '' });
            toast.success("Invitación enviada correctamente al correo.", { id: toastId });
            cargarDatos();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al enviar la invitación", { id: toastId });
        } finally {
            setEnviando(false);
        }
    };

    const confirmEliminar = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/usuarios/${userToDelete}`);
            toast.success("Usuario eliminado correctamente 🗑️");
            cargarDatos();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al eliminar");
        } finally {
            setUserToDelete(null);
        }
    };

    const confirmReset = async () => {
        if (!userToReset) return;
        const toastId = toast.loading("Enviando correo de recuperación...");
        try {
            await api.post('/auth/recuperar', { usuario: userToReset });
            toast.success("Correo enviado con éxito 📧", { id: toastId });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al enviar el correo", { id: toastId });
        } finally {
            setUserToReset(null);
        }
    };

    const abrirModalEditar = (u: any) => {
        setUsuarioAEditar(u.id_usuario);
        setFormData({
            nombre: u.nombre,
            usuario: u.usuario,
            email: u.email || '',
            rol: u.rol,
            estado: u.estado
        });
        setShowModalEditar(true);
    };

    const handleEditarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/usuarios/${usuarioAEditar}`, formData);
            toast.success("Usuario actualizado correctamente ✅");
            setShowModalEditar(false);
            cargarDatos();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al guardar cambios");
        }
    };

    // 🟢 ESTADOS PARA EDITAR EMPRESA
    const [showModalEditarEmpresa, setShowModalEditarEmpresa] = useState(false);
    const [guardandoEmpresa, setGuardandoEmpresa] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [nuevaSede, setNuevaSede] = useState(""); // 🟢 Estado para el input de nueva sede
    const [formDataEmpresa, setFormDataEmpresa] = useState({
        nombre: '',
        ruc: '',
        direccion_principal: '', // 🟢 CORREGIDO: Coincide con Prisma
        codigo_formato: '',
        sedes_adicionales: [] as string[] // 🟢 NUEVO: Arreglo de sedes
    });

    const abrirModalEditarEmpresa = () => {
        // 🟢 Asegurarnos de que las sedes se lean correctamente como Array
        let sedesGuardadas = [];
        if (empresa?.sedes_adicionales) {
            sedesGuardadas = typeof empresa.sedes_adicionales === 'string'
                ? JSON.parse(empresa.sedes_adicionales)
                : empresa.sedes_adicionales;
        }

        setFormDataEmpresa({
            nombre: empresa?.nombre || '',
            ruc: empresa?.ruc || '',
            direccion_principal: empresa?.direccion_principal || '', // 🟢 CORREGIDO
            codigo_formato: empresa?.codigo_formato || '',
            sedes_adicionales: sedesGuardadas // 🟢 Cargamos las sedes
        });
        setNuevaSede("");
        setLogoFile(null);
        setShowModalEditarEmpresa(true);
    };

    // 🟢 Función para agregar una sede al arreglo
    const handleAgregarSede = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (nuevaSede.trim() !== "") {
            setFormDataEmpresa({
                ...formDataEmpresa,
                sedes_adicionales: [...formDataEmpresa.sedes_adicionales, nuevaSede.trim()]
            });
            setNuevaSede(""); // Limpiamos el input
        }
    };

    // 🟢 Función para eliminar una sede del arreglo
    const handleEliminarSede = (index: number) => {
        const nuevasSedes = formDataEmpresa.sedes_adicionales.filter((_, i) => i !== index);
        setFormDataEmpresa({ ...formDataEmpresa, sedes_adicionales: nuevasSedes });
    };

    const handleEditarEmpresaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardandoEmpresa(true);
        const toastId = toast.loading("Actualizando datos de la empresa...");

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('nombre', formDataEmpresa.nombre);
            formDataToSend.append('ruc', formDataEmpresa.ruc);
            formDataToSend.append('direccion_principal', formDataEmpresa.direccion_principal); // 🟢 CORREGIDO
            formDataToSend.append('codigo_formato', formDataEmpresa.codigo_formato);

            // 🟢 Enviamos las sedes adicionales como un String JSON
            formDataToSend.append('sedes_adicionales', JSON.stringify(formDataEmpresa.sedes_adicionales));

            if (logoFile) {
                formDataToSend.append('logo', logoFile);
            }

            await api.put(`/empresa/saas/empresas/${id}`, formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Empresa actualizada con éxito 🏢", { id: toastId });
            setShowModalEditarEmpresa(false);
            cargarDatos();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al actualizar la empresa", { id: toastId });
        } finally {
            setGuardandoEmpresa(false);
        }
    };

    const usuariosFiltrados = usuarios.filter((u: any) =>
        u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        u.usuario.toLowerCase().includes(filtro.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando detalles del cliente...</div>;
    if (!empresa) return <div className="p-8 text-center text-red-500">Empresa no encontrada</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header con retroceso */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/empresas')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Building2 className="text-blue-500" /> {empresa.nombre}
                            </h1>
                            {/* 🟢 BOTÓN EDITAR EMPRESA */}
                            <button
                                onClick={abrirModalEditarEmpresa}
                                className="p-1.5 bg-gray-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                title="Editar Datos de la Empresa"
                            >
                                <Pencil size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">RUC: {empresa.ruc} | Código Formato: {empresa.codigo_formato}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${empresa.estado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {empresa.estado ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        {empresa.estado ? 'Cuenta Activa' : 'Cuenta Suspendida'}
                    </div>
                    <button
                        onClick={handleToggleEstado}
                        className={`p-2 rounded-xl border transition-all ${empresa.estado ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'
                            }`}
                        title={empresa.estado ? "Suspender Empresa" : "Reactivar Empresa"}
                    >
                        <ShieldAlert size={20} />
                    </button>
                </div>
            </div>

            {/* Grid de Stats Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-[#0B1121] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Usuarios Activos</p>
                            <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{usuarios.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0B1121] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-2xl">
                            <FileText size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Actas Generadas</p>
                            <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{empresa._count?.capacitaciones || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0B1121] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-2xl">
                            <Calendar size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Cliente desde</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-white mt-2">
                                {empresa.fecha_registro ? new Date(empresa.fecha_registro).toLocaleDateString('es-PE') : 'Reciente'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Listado de Usuarios */}
            <div className="bg-white dark:bg-[#0B1121] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-500" size={20} /> Equipo Registrado
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowModalInvitacion(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            <UserPlus size={18} /> Invitar Usuario
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white dark:bg-gray-900/50 text-gray-400 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Email / Credencial</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {usuariosFiltrados.map((u: any) => (
                                <tr key={u.id_usuario} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center font-black shadow-inner border border-white">
                                                {u.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">{u.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${u.rol.toLowerCase() === 'administrador' ? 'bg-purple-100 text-purple-700' :
                                            u.rol.toLowerCase() === 'auditor' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                                            <Mail size={14} className="opacity-70" /> {u.email || u.usuario}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-all duration-200">
                                            <button onClick={() => setUserToReset(u.email || u.usuario)} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Enviar Recuperación">
                                                <Mail size={18} />
                                            </button>
                                            <button onClick={() => abrirModalEditar(u)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => setUserToDelete(u.id_usuario)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {usuariosFiltrados.length === 0 && (
                        <div className="p-16 text-center flex flex-col items-center">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-3">
                                <Users size={32} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No se encontraron usuarios.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALES --- */}

            {/* 🟢 MODAL DE INVITACIÓN */}
            {showModalInvitacion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#0B1121] w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                <Mail className="text-blue-500" size={20} /> Invitar Colaborador
                            </h2>
                            <button onClick={() => setShowModalInvitacion(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleInvitarUsuario} className="p-6 space-y-6">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">1. Seleccionar Rol</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Administrador', 'Supervisor', 'Auditor'].map((rol) => (
                                        <button
                                            key={rol} type="button"
                                            onClick={() => setInvitacion({ ...invitacion, rol })}
                                            className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${invitacion.rol === rol ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            <span className="text-[10px] uppercase tracking-wide">{rol}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">2. Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="email" required className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="ejemplo@correo.com" value={invitacion.email} onChange={(e) => setInvitacion({ ...invitacion, email: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" disabled={enviando} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70">
                                {enviando ? "Enviando..." : "Enviar Invitación"}
                                {!enviando && <ChevronRight size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 🟢 MODAL ELIMINAR */}
            {userToDelete !== null && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Eliminar Usuario?</h3>
                            <p className="text-slate-500 text-sm">Esta acción es permanente y el usuario perderá el acceso a {empresa.nombre}.</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                            <button onClick={() => setUserToDelete(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50">Cancelar</button>
                            <button onClick={confirmEliminar} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20">Sí, Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 MODAL RESET PASSWORD */}
            {userToReset !== null && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Restablecer Acceso</h3>
                            <p className="text-slate-500 text-sm">Se enviará un correo a <strong>{userToReset}</strong> para que pueda cambiar su contraseña.</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                            <button onClick={() => setUserToReset(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200">Cancelar</button>
                            <button onClick={confirmReset} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">Enviar Correo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 MODAL EDITAR USUARIO */}
            {showModalEditar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Pencil size={20} className="text-blue-600" /> Editar Usuario
                            </h3>
                            <button onClick={() => setShowModalEditar(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleEditarSubmit} className="p-6 space-y-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full border dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" required />
                                </div>
                            </div>

                            {/* Correo Electrónico */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" required />
                                </div>
                            </div>

                            {/* Usuario (Login) y Rol */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Usuario (Login)</label>
                                    <input type="text" value={formData.usuario} onChange={(e) => setFormData({ ...formData, usuario: e.target.value })} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rol</label>
                                    <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                        <option value="Administrador">Administrador</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Auditor">Auditor</option>
                                    </select>
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Estado</label>
                                <select value={String(formData.estado)} onChange={(e) => setFormData({ ...formData, estado: e.target.value === 'true' })} className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                    <option value="true">Activo</option>
                                    <option value="false">Inactivo</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModalEditar(false)} className="flex-1 px-4 py-2 border dark:border-slate-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex justify-center items-center gap-2"><Save size={18} /> Actualizar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 🟢 MODAL PROFESIONAL: EDITAR EMPRESA (Ahora está libre y separado) */}
            {showModalEditarEmpresa && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20 sticky top-0 z-10">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Building2 size={20} className="text-blue-600" /> Editar Perfil de Empresa
                            </h3>
                            <button onClick={() => setShowModalEditarEmpresa(false)} className="text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleEditarEmpresaSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nombre de la Agrícola / Empresa</label>
                                    <input type="text" value={formDataEmpresa.nombre} onChange={(e) => setFormDataEmpresa({ ...formDataEmpresa, nombre: e.target.value })} className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">RUC</label>
                                    <input type="text" value={formDataEmpresa.ruc} onChange={(e) => setFormDataEmpresa({ ...formDataEmpresa, ruc: e.target.value })} className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm" maxLength={11} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Código de Formato (PDF)</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="text" value={formDataEmpresa.codigo_formato} onChange={(e) => setFormDataEmpresa({ ...formDataEmpresa, codigo_formato: e.target.value })} className="w-full border border-gray-200 dark:border-slate-600 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm" placeholder="Ej: F-SST-05" />
                                    </div>
                                    <p className="text-[10px] text-gray-400">Aparecerá en la cabecera de las actas.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dirección Principal</label>
                                    {/* 🟢 CORREGIDO: formDataEmpresa.direccion_principal */}
                                    <input type="text" value={formDataEmpresa.direccion_principal} onChange={(e) => setFormDataEmpresa({ ...formDataEmpresa, direccion_principal: e.target.value })} className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm" placeholder="Ej: Fundo San José Mz. B Lote 3" required />
                                </div>
                            </div>

                            {/* 🟢 NUEVO BLOQUE: SEDES ADICIONALES */}
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Sedes Adicionales / Fundos</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={nuevaSede}
                                        onChange={(e) => setNuevaSede(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAgregarSede(e)}
                                        className="flex-1 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm text-sm"
                                        placeholder="Ej: Sede Olmos"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAgregarSede}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold rounded-xl transition-colors text-sm border border-slate-200 dark:border-slate-600"
                                    >
                                        Añadir
                                    </button>
                                </div>

                                {/* 🟢 Píldoras visuales para mostrar las sedes añadidas */}
                                {formDataEmpresa.sedes_adicionales.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 rounded-xl">
                                        {formDataEmpresa.sedes_adicionales.map((sede, index) => (
                                            <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-sm font-medium rounded-lg shadow-sm text-gray-700 dark:text-gray-200">
                                                <span>{sede}</span>
                                                <button type="button" onClick={() => handleEliminarSede(index)} className="text-gray-400 hover:text-red-500 transition-colors p-0.5"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-slate-700 mt-4">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Logo Institucional (Opcional)</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-600 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                                        {logoFile ? (
                                            <img src={URL.createObjectURL(logoFile)} alt="Preview" className="object-contain w-full h-full" />
                                        ) : empresa?.logo_url ? (
                                            <img src={empresa.logo_url} alt="Logo Actual" className="object-contain w-full h-full" />
                                        ) : (
                                            <Building2 size={24} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all dark:file:bg-slate-700 dark:file:text-blue-400"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Sube un nuevo archivo si deseas cambiar el logo actual. Máx 2MB.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
                                <button type="button" onClick={() => setShowModalEditarEmpresa(false)} className="flex-1 px-4 py-3 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 font-bold transition-colors">Cancelar</button>
                                <button type="submit" disabled={guardandoEmpresa} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                    <Save size={18} /> {guardandoEmpresa ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}