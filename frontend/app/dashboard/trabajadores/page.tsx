'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/services/api';
import { uploadImageToLocal } from '@/services/upload.service';
import {
    Users, Search, Plus, Edit, Trash2,
    Save, X, CheckCircle2, UploadCloud, Loader2,
    ChevronLeft, ChevronRight, FileSpreadsheet, ChevronDown, Eraser
} from 'lucide-react';

interface Trabajador {
    id_trabajador: number;
    dni: string;
    nombres: string;
    apellidos: string;
    area: string;
    cargo: string;
    genero: string;
    firma_url?: string;
    categoria?: string; // Agregado por si quieres mostrarlo en el futuro
}

export default function TrabajadoresPage() {
    const [lista, setLista] = useState<Trabajador[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Modales
    const [modalOpen, setModalOpen] = useState(false);
    const [modalExcelOpen, setModalExcelOpen] = useState(false);
    const [menuNuevoOpen, setMenuNuevoOpen] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [uploadingFirma, setUploadingFirma] = useState(false);
    const [subiendoMasivo, setSubiendoMasivo] = useState(false);
    const [subiendoExcel, setSubiendoExcel] = useState(false);

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 30;

    const { register, handleSubmit, reset, setValue, watch } = useForm<Trabajador>();
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuNuevoOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
    useEffect(() => { setPaginaActual(1); }, [busqueda]);

    // Guardar (Crear/Editar)
    const onSubmit = async (data: Trabajador) => {
        try {
            if (editingId) {
                await api.put(`/trabajadores/${editingId}`, data); // Asumiendo PUT para editar
            } else {
                await api.post('/trabajadores', data);
            }
            fetchTrabajadores();
            setModalOpen(false);
            reset();
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert("Error al guardar trabajador");
        }
    };

    const handleEdit = (t: Trabajador) => {
        setEditingId(t.id_trabajador);
        reset(t);
        setModalOpen(true);
    };

    // 1. Eliminar Trabajador
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

    // 2. Eliminar Firma Individual 
    const handleDeleteFirma = async (id: number, nombre: string) => {
        if (!confirm(`¿Borrar la firma de ${nombre}?`)) return;
        try {
            await api.put(`/trabajadores/${id}/eliminar-firma`);
            fetchTrabajadores();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar firma");
        }
    };

    // 3. Subir Firma Individual
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

    // 4. Carga Masiva Firmas
    const handleCargaMasivaFirmas = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (!confirm(`Subir ${files.length} firmas (Nombre archivo = DNI). ¿Continuar?`)) {
            e.target.value = ''; return;
        }
        setSubiendoMasivo(true);
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('firmas', file));

        try {
            const { data } = await api.post('/trabajadores/upload-masivo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Reporte:\n✅ ${data.actualizados_correctamente}\n❌ ${data.no_encontrados_o_error}`);
            fetchTrabajadores();
        } catch (error) {
            console.error(error);
            alert("Error en carga masiva.");
        } finally {
            setSubiendoMasivo(false);
            e.target.value = '';
        }
    };

    // 5. 🟢 Carga Masiva EXCEL
    const handleUploadExcel = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        setSubiendoExcel(true);
        const formData = new FormData();
        formData.append('excel', file);

        try {
            // Asegúrate que esta ruta coincida con tu backend ('/upload-trabajadores' o '/trabajadores/importar-excel')
            const { data } = await api.post('/trabajadores/importar-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert(`Importación Finalizada:\n👥 Procesados: ${data.processed || data.procesados || 0}`);
            fetchTrabajadores();
            setModalExcelOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error procesando el Excel. Revisa el formato o la consola.");
        } finally {
            setSubiendoExcel(false);
        }
    };

    // Filtrado y Paginación
    const filtrados = lista.filter(t =>
        `${t.apellidos} ${t.nombres}`.toLowerCase().includes(busqueda.toLowerCase()) ||
        (t.dni || "").includes(busqueda)
    );
    const indiceUltimoItem = paginaActual * itemsPorPagina;
    const itemsActuales = filtrados.slice(indiceUltimoItem - itemsPorPagina, indiceUltimoItem);
    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-600" /> Maestro de Trabajadores
                    </h1>
                    <p className="text-sm text-gray-500">Total: <b>{lista.length}</b> registros.</p>
                </div>

                <div className="flex gap-3 items-center">
                    {/* Botón Carga Masiva Firmas */}
                    <div className="relative">
                        <input type="file" id="masivo-upload" className="hidden" multiple accept="image/*" onChange={handleCargaMasivaFirmas} disabled={subiendoMasivo} />
                        <label htmlFor="masivo-upload" className={`cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${subiendoMasivo ? 'opacity-50' : ''}`}>
                            {subiendoMasivo ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                            {subiendoMasivo ? '...' : 'Subir Firmas'}
                        </label>
                    </div>

                    {/* Botón Nuevo con Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuNuevoOpen(!menuNuevoOpen)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 transition"
                        >
                            <Plus size={20} /> Nuevo <ChevronDown size={16} />
                        </button>

                        {menuNuevoOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={() => { setEditingId(null); reset({ genero: 'M' }); setModalOpen(true); setMenuNuevoOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                >
                                    <Users size={16} /> Individual
                                </button>
                                <button
                                    onClick={() => { setModalExcelOpen(true); setMenuNuevoOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-green-700 font-medium border-t border-gray-100"
                                >
                                    <FileSpreadsheet size={16} /> Importar Excel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text" placeholder="Buscar por DNI o Nombre..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
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
                                    <td className="px-6 py-3 font-medium text-gray-800">{t.apellidos} {t.nombres}</td>
                                    <td className="px-6 py-3 text-gray-500">
                                        <div className="font-bold">{t.cargo}</div>
                                        <div className="text-xs">{t.area}</div>
                                        {/* Indicador visual si es EDS/CIFHS */}
                                        {t.categoria && (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1 font-bold">
                                                {t.categoria}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {t.firma_url ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
                                                    <CheckCircle2 size={12} /> Sí
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteFirma(t.id_trabajador, t.nombres)}
                                                    className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition"
                                                    title="Borrar firma"
                                                >
                                                    <Eraser size={14} />
                                                </button>
                                            </div>
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
                    {itemsActuales.length === 0 && !loading && <div className="p-8 text-center text-gray-500">No se encontraron trabajadores.</div>}
                </div>

                {/* Paginación */}
                {filtrados.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">Página {paginaActual} de {totalPaginas}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EXCEL */}
            {modalExcelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FileSpreadsheet className="text-green-600" /> Importar Excel
                            </h3>
                            <button onClick={() => setModalExcelOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6">
                            <p className="font-bold mb-1">Instrucciones:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Sube el reporte de Nisira (CSV o Excel).</li>
                                <li>El sistema limpiará y unirá las líneas rotas automáticamente.</li>
                                <li>Actualizará DNI, Nombres, Cargo, Área y Categoría (EDS, CIFHS).</li>
                            </ul>
                        </div>

                        <form onSubmit={handleUploadExcel} className="space-y-4">
                            <input type="file" required accept=".csv, .xlsx, .xls" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setModalExcelOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" disabled={subiendoExcel} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold flex items-center gap-2 disabled:opacity-50">
                                    {subiendoExcel ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                    {subiendoExcel ? "Procesando..." : "Importar Ahora"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL INDIVIDUAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Editar' : 'Nuevo'} Trabajador</h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-700">DNI</label><input {...register("dni", { required: true })} className="w-full border rounded px-3 py-2" /></div>
                                <div><label className="text-xs font-bold text-gray-700">Género</label><select {...register("genero")} className="w-full border rounded px-3 py-2"><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-700">Apellidos</label><input {...register("apellidos", { required: true })} className="w-full border rounded px-3 py-2" /></div>
                                <div><label className="text-xs font-bold text-gray-700">Nombres</label><input {...register("nombres", { required: true })} className="w-full border rounded px-3 py-2" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-700">Cargo</label><input {...register("cargo")} className="w-full border rounded px-3 py-2" /></div>
                                <div><label className="text-xs font-bold text-gray-700">Área</label><input {...register("area")} className="w-full border rounded px-3 py-2" /></div>
                            </div>

                            {/* Input Firma Individual */}
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 mb-2">Firma Digital</label>
                                <div className="flex items-center gap-3">
                                    <input type="hidden" {...register("firma_url")} />
                                    <input type="file" id="firma-upload" className="hidden" accept="image/*" onChange={handleUploadFirma} />
                                    {watch('firma_url') ? (
                                        <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                                            <CheckCircle2 size={18} /> Cargada
                                            <button type="button" onClick={() => setValue('firma_url', '')} className="text-red-500 ml-2"><Trash2 size={14} /></button>
                                        </div>
                                    ) : (
                                        <label htmlFor="firma-upload" className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm">
                                            {uploadingFirma ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                            {uploadingFirma ? "Subiendo..." : "Adjuntar"}
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2"><Save size={18} /> Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}