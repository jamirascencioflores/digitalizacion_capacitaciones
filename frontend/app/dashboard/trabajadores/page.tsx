'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/services/api';
import { uploadImageToLocal } from '@/services/upload.service';
import {
    Users, Search, Plus, Edit, Trash2,
    Save, X, CheckCircle2, UploadCloud, Loader2,
    ChevronLeft, ChevronRight
} from 'lucide-react';

interface Trabajador {
    id_trabajador: number;
    dni: string;
    // CORRECCIÓN: Separamos los campos para coincidir con el backend
    nombres: string;
    apellidos: string;
    area: string;
    cargo: string;
    genero: string;
    firma_url?: string;
}

export default function TrabajadoresPage() {
    const [lista, setLista] = useState<Trabajador[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [uploadingFirma, setUploadingFirma] = useState(false);
    const [subiendoMasivo, setSubiendoMasivo] = useState(false);

    // --- ESTADOS PARA PAGINACIÓN ---
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 30;

    const { register, handleSubmit, reset, setValue, watch } = useForm<Trabajador>();

    // 1. Cargar lista
    const fetchTrabajadores = async () => {
        try {
            const { data } = await api.get('/trabajadores');
            setLista(data);
        } catch (error) {
            console.error("Error al cargar lista:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTrabajadores(); }, []);

    // Resetear a página 1 cuando se busca algo
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    // 2. Guardar (Crear o Editar)
    const onSubmit = async (data: Trabajador) => {
        try {
            // El backend ahora espera { nombres, apellidos, ... }
            await api.post('/trabajadores', data);
            fetchTrabajadores();
            setModalOpen(false);
            reset();
        } catch (error) {
            console.error(error);
            alert("Error al guardar trabajador");
        }
    };

    // 3. Editar
    const handleEdit = (t: Trabajador) => {
        setEditingId(t.id_trabajador);
        reset(t); // Esto rellenará automáticamente nombres y apellidos por separado
        setModalOpen(true);
    };

    // 4. Eliminar
    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar trabajador?")) return;
        try {
            await api.delete(`/trabajadores/${id}`);
            setLista(prev => prev.filter(t => t.id_trabajador !== id));
        } catch (error) {
            console.error(error);
            alert("No se puede eliminar (posiblemente tiene capacitaciones asociadas).");
        }
    };

    // 5. Subir Firma Individual
    const handleUploadFirma = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFirma(true);
        try {
            const url = await uploadImageToLocal(file);
            if (url) setValue('firma_url', url);
        } catch (error) {
            console.error(error);
            alert("Error subiendo firma");
        } finally {
            setUploadingFirma(false);
        }
    };

    // 6. Carga Masiva
    const handleCargaMasiva = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (!confirm(`Vas a subir ${files.length} firmas. \nAsegúrate de que los archivos se llamen como el DNI (ej: 44556677.jpg).\n¿Continuar?`)) {
            e.target.value = '';
            return;
        }

        setSubiendoMasivo(true);
        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append('firmas', file);
        });

        try {
            const { data } = await api.post('/trabajadores/upload-masivo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Reporte de Carga:\n\n✅ Actualizados: ${data.actualizados_correctamente}\n❌ Ignorados/Errores: ${data.no_encontrados_o_error}`);
            fetchTrabajadores();
        } catch (error) {
            console.error(error);
            alert("Error en la carga masiva.");
        } finally {
            setSubiendoMasivo(false);
            e.target.value = '';
        }
    };

    // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
    const filtrados = lista.filter(t => {
        // Concatenamos para buscar en el nombre completo
        const nombreCompleto = `${t.apellidos} ${t.nombres}`.toLowerCase();
        return nombreCompleto.includes(busqueda.toLowerCase()) ||
            (t.dni || "").includes(busqueda);
    });

    // Calcular índices para cortar el array
    const indiceUltimoItem = paginaActual * itemsPorPagina;
    const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
    const itemsActuales = filtrados.slice(indicePrimerItem, indiceUltimoItem);
    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);

    // Cambiar página
    const cambiarPagina = (numero: number) => setPaginaActual(numero);

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-600" /> Maestro de Trabajadores
                    </h1>
                    <p className="text-sm text-gray-500">
                        Total: <span className="font-bold text-gray-700">{lista.length}</span> trabajadores registrados.
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="file"
                            id="masivo-upload"
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleCargaMasiva}
                            disabled={subiendoMasivo}
                        />
                        <label
                            htmlFor="masivo-upload"
                            className={`cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold flex items-center gap-2 transition ${subiendoMasivo ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {subiendoMasivo ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                            {subiendoMasivo ? 'Procesando...' : 'Carga Masiva Firmas'}
                        </label>
                    </div>

                    <button
                        onClick={() => { setEditingId(null); reset({ genero: 'M' }); setModalOpen(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 transition"
                    >
                        <Plus size={20} /> Nuevo
                    </button>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por DNI o Nombre..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                />
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-3">DNI</th>
                                <th className="px-6 py-3">Apellidos y Nombres</th>
                                <th className="px-6 py-3">Cargo / Área</th>
                                <th className="px-6 py-3 text-center">Firma</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {itemsActuales.map(t => (
                                <tr key={t.id_trabajador} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-mono text-blue-600 font-bold">{t.dni}</td>
                                    {/* CORRECCIÓN: Concatenamos campos separados para visualizar */}
                                    <td className="px-6 py-3 font-medium text-gray-800">
                                        {t.apellidos} {t.nombres}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500">
                                        <div className="font-bold">{t.cargo}</div>
                                        <div className="text-xs">{t.area}</div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {t.firma_url ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
                                                <CheckCircle2 size={12} /> Sí
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">No</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEdit(t)} className="p-2 text-amber-600 bg-amber-50 rounded hover:bg-amber-100"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(t.id_trabajador)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {itemsActuales.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">No se encontraron trabajadores.</div>
                    )}
                </div>

                {/* --- CONTROLES DE PAGINACIÓN --- */}
                {filtrados.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">
                            Mostrando <strong>{indicePrimerItem + 1}</strong> a <strong>{Math.min(indiceUltimoItem, filtrados.length)}</strong> de <strong>{filtrados.length}</strong> resultados
                        </span>

                        <div className="flex gap-2">
                            <button
                                onClick={() => cambiarPagina(paginaActual - 1)}
                                disabled={paginaActual === 1}
                                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPaginas > 5 && paginaActual > 3) {
                                        pageNum = paginaActual - 2 + i;
                                    }
                                    if (pageNum > totalPaginas) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => cambiarPagina(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition ${paginaActual === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => cambiarPagina(paginaActual + 1)}
                                disabled={paginaActual === totalPaginas}
                                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Editar Trabajador' : 'Nuevo Trabajador'}
                            </h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">DNI</label>
                                    <input {...register("dni", { required: true, maxLength: 8 })} className="w-full border rounded px-3 py-2" placeholder="8 dígitos" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Género</label>
                                    <select {...register("genero")} className="w-full border rounded px-3 py-2">
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </div>
                            </div>

                            {/* CORRECCIÓN: Inputs separados para Apellidos y Nombres */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Apellidos</label>
                                    <input {...register("apellidos", { required: true })} className="w-full border rounded px-3 py-2" placeholder="Ej: Perez Lopez" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombres</label>
                                    <input {...register("nombres", { required: true })} className="w-full border rounded px-3 py-2" placeholder="Ej: Juan Carlos" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Cargo</label>
                                    <input {...register("cargo")} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Área</label>
                                    <input {...register("area")} className="w-full border rounded px-3 py-2" />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 mb-2">Firma Digital (Imagen)</label>
                                <div className="flex items-center gap-3">
                                    <input type="hidden" {...register("firma_url")} />
                                    <input type="file" id="firma-upload" className="hidden" accept="image/*" onChange={handleUploadFirma} />

                                    {watch('firma_url') ? (
                                        <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                                            <CheckCircle2 size={18} /> Firma cargada
                                            <button type="button" onClick={() => setValue('firma_url', '')} className="text-red-500 ml-2"><Trash2 size={14} /></button>
                                        </div>
                                    ) : (
                                        <label htmlFor="firma-upload" className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">
                                            {uploadingFirma ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                            {uploadingFirma ? "Subiendo..." : "Adjuntar Imagen"}
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                                    <Save size={18} /> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}