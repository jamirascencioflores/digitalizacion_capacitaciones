'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/services/api';
import { uploadImageToLocal } from '@/services/upload.service';
import {
    Users, Search, Plus, Edit, Trash2,
    Save, X, CheckCircle2, UploadCloud, Loader2,
    ChevronLeft, ChevronRight, FileSpreadsheet, ChevronDown, Eraser, AlertCircle
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

// Interfaces para nuestros Modales Personalizados
interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
}

interface AlertDialogState {
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    type: 'success' | 'error' | 'info';
}

export default function TrabajadoresPage() {
    const [lista, setLista] = useState<Trabajador[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Modales de UI
    const [modalOpen, setModalOpen] = useState(false);
    const [modalExcelOpen, setModalExcelOpen] = useState(false);
    const [menuNuevoOpen, setMenuNuevoOpen] = useState(false);

    // Modales de Alerta Personalizados
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [alertDialog, setAlertDialog] = useState<AlertDialogState | null>(null);

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
                await api.put(`/trabajadores/${editingId}`, data);
            } else {
                await api.post('/trabajadores', data);
            }
            fetchTrabajadores();
            setModalOpen(false);
            reset();
            setEditingId(null);
            setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Trabajador guardado correctamente.', type: 'success' });
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al guardar los datos del trabajador.', type: 'error' });
        }
    };

    const handleEdit = (t: Trabajador) => {
        setEditingId(t.id_trabajador);
        reset(t);
        setModalOpen(true);
    };

    // 1. Eliminar Trabajador
    const handleDeleteClick = (t: Trabajador) => {
        setConfirmDialog({
            isOpen: true,
            title: "Eliminar Trabajador",
            message: `¿Estás seguro de que deseas eliminar permanentemente a ${t.nombres} ${t.apellidos}?\nEsta acción es irreversible.`,
            onConfirm: () => {
                setConfirmDialog(null);
                ejecutarDeleteTrabajador(t.id_trabajador);
            }
        });
    };

    const ejecutarDeleteTrabajador = async (id: number) => {
        try {
            await api.delete(`/trabajadores/${id}`);
            setLista(prev => prev.filter(t => t.id_trabajador !== id));
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Acción Denegada', message: 'No se puede eliminar (posiblemente tiene capacitaciones asociadas).', type: 'error' });
        }
    };

    // 2. Eliminar Firma Individual 
    const handleDeleteFirmaClick = (t: Trabajador) => {
        setConfirmDialog({
            isOpen: true,
            title: "Borrar Firma Digital",
            message: `¿Estás seguro de que deseas borrar la firma de ${t.nombres} ${t.apellidos}?`,
            onConfirm: () => {
                setConfirmDialog(null);
                ejecutarDeleteFirma(t.id_trabajador);
            }
        });
    };

    const ejecutarDeleteFirma = async (id: number) => {
        try {
            await api.put(`/trabajadores/${id}/eliminar-firma`);
            fetchTrabajadores();
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Error', message: 'Hubo un problema al eliminar la firma.', type: 'error' });
        }
    };

    // 3. Subir Firma Individual
    const handleUploadFirma = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFirma(true);

        try {
            const webpFile = await convertirAWebp(file);
            const url = await uploadImageToLocal(webpFile);
            if (url) {
                setValue('firma_url', url);
            }
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Error', message: 'Hubo un error al intentar subir la firma.', type: 'error' });
        } finally {
            setUploadingFirma(false);
        }
    };

    // 4. Carga Masiva Firmas
    const handleCargaMasivaFirmas = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const filesArray = Array.from(files);

        setConfirmDialog({
            isOpen: true,
            title: "Carga Masiva de Firmas",
            message: (
                <div className="space-y-3">
                    <p>Has seleccionado <b>{filesArray.length} archivo(s)</b> para vincular.</p>
                    <p>Recuerda que el nombre de cada imagen debe coincidir exactamente con el <b>DNI</b> del trabajador (Ej: <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">72145698.png</span>).</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-2">
                        💡 Tip: En la ventana de selección puedes presionar <b>Ctrl + E</b> (o Ctrl + A) para seleccionar rápidamente todas las firmas de tu carpeta.
                    </p>
                    <p className="font-bold text-gray-800 mt-2">¿Deseas iniciar el proceso ahora?</p>
                </div>
            ),
            onConfirm: () => {
                setConfirmDialog(null);
                ejecutarCargaMasiva(filesArray);
            }
        });

        e.target.value = ''; // Reset para permitir seleccionar los mismos archivos si cancela
    };

    const ejecutarCargaMasiva = async (filesArray: File[]) => {
        setSubiendoMasivo(true);
        const formData = new FormData();
        filesArray.forEach((file) => formData.append('firmas', file));

        try {
            const { data } = await api.post('/trabajadores/upload-masivo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAlertDialog({
                isOpen: true,
                title: 'Importación Finalizada',
                message: (
                    <div className="text-left space-y-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between font-bold text-green-600">
                            <span>✅ Firmas actualizadas:</span> <span>{data.actualizados_correctamente}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-500">
                            <span>❌ DNI no encontrados / Error:</span> <span>{data.no_encontrados_o_error}</span>
                        </div>
                    </div>
                ),
                type: 'success'
            });
            fetchTrabajadores();
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo completar la carga masiva de firmas.', type: 'error' });
        } finally {
            setSubiendoMasivo(false);
        }
    };

    // 5. Carga Masiva EXCEL
    const handleUploadExcel = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        setSubiendoExcel(true);
        const formData = new FormData();
        formData.append('excel', file);

        try {
            const { data } = await api.post('/trabajadores/importar-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAlertDialog({
                isOpen: true,
                title: 'Base de Datos Actualizada',
                message: `Se importaron/actualizaron correctamente ${data.processed || data.procesados || 0} trabajadores desde el Excel.`,
                type: 'success'
            });
            fetchTrabajadores();
            setModalExcelOpen(false);
        } catch (error) {
            console.error(error);
            setAlertDialog({ isOpen: true, title: 'Error', message: 'Ocurrió un error procesando el Excel. Revisa el formato o la consola.', type: 'error' });
        } finally {
            setSubiendoExcel(false);
        }
    };

    const convertirAWebp = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No se pudo crear el canvas');

                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        resolve(new File([blob], newName, { type: 'image/webp' }));
                    } else reject('Error WebP');
                }, 'image/webp', 0.8);
            };
            img.onerror = error => reject(error);
        });
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
        <div className="space-y-6 relative pb-20">

            {/* --- MODAL CONFIRMACIÓN GENÉRICO --- */}
            {confirmDialog && confirmDialog.isOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-500">
                            <AlertCircle size={28} />
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{confirmDialog.title}</h3>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed whitespace-pre-line">
                            {confirmDialog.message}
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                            <button onClick={() => setConfirmDialog(null)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl font-bold text-sm transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button onClick={confirmDialog.onConfirm} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors active:scale-95 flex items-center gap-2">
                                <CheckCircle2 size={18} /> Sí, Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL ALERTA GENÉRICA --- */}
            {alertDialog && alertDialog.isOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 flex flex-col items-center text-center border border-gray-100 dark:border-slate-700">
                        {alertDialog.type === 'success' ? (
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                <CheckCircle2 size={40} strokeWidth={3} />
                            </div>
                        ) : alertDialog.type === 'error' ? (
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                <X size={40} strokeWidth={3} />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-5 shadow-inner">
                                <AlertCircle size={40} strokeWidth={3} />
                            </div>
                        )}
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{alertDialog.title}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-8 w-full">
                            {alertDialog.message}
                        </div>
                        <button onClick={() => setAlertDialog(null)} className="w-full py-3.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl font-bold tracking-widest uppercase text-xs transition-colors active:scale-95 shadow-sm">
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Encabezado */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-400" /> Maestro de Trabajadores
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total: <b className="text-gray-700 dark:text-gray-300">{lista.length}</b> registros.</p>
                </div>

                <div className="flex gap-3 items-center">
                    {/* Botón Carga Masiva Firmas */}
                    <div className="relative">
                        <input type="file" id="masivo-upload" className="hidden" multiple accept="image/*" onChange={handleCargaMasivaFirmas} disabled={subiendoMasivo} />
                        <label htmlFor="masivo-upload" title="Tip: Usa Ctrl+E para seleccionar todos los archivos" className={`cursor-pointer bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${subiendoMasivo ? 'opacity-50 pointer-events-none' : ''}`}>
                            {subiendoMasivo ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                            {subiendoMasivo ? 'Procesando...' : 'Subir Firmas'}
                        </label>
                    </div>

                    {/* Botón Nuevo con Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuNuevoOpen(!menuNuevoOpen)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 transition shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            <Plus size={20} /> Nuevo <ChevronDown size={16} />
                        </button>

                        {menuNuevoOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                <button
                                    onClick={() => { setEditingId(null); reset({ genero: 'M' }); setModalOpen(true); setMenuNuevoOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                                >
                                    <Users size={16} className="text-blue-500" /> Individual
                                </button>
                                <button
                                    onClick={() => { setModalExcelOpen(true); setMenuNuevoOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-slate-700 flex items-center gap-2 text-green-700 dark:text-green-500 font-medium border-t border-gray-100 dark:border-slate-700 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-green-500" /> Importar Excel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                    type="text" placeholder="Buscar por DNI o Nombre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm transition-all"
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                />
            </div>

            {/* LISTA / TABLA */}
            <div className="bg-gray-50/20 dark:bg-slate-800/20 md:bg-white md:dark:bg-slate-800 md:rounded-2xl md:shadow-sm md:border md:border-gray-200 md:dark:border-slate-700 overflow-hidden">
                {itemsActuales.length === 0 && !loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 md:bg-transparent md:dark:bg-transparent rounded-xl">No se encontraron trabajadores.</div>
                ) : (
                    <>
                        {/* --- VISTA MÓVIL (TARJETAS) --- */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {itemsActuales.map(t => (
                                <div key={t.id_trabajador} className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3 relative overflow-hidden group">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md self-start mb-1 border border-blue-100 dark:border-blue-800/50">{t.dni}</span>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight">
                                                {t.apellidos} {t.nombres}
                                            </h4>
                                        </div>
                                        <div className="flex shrink-0">
                                            {t.firma_url ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50 shadow-sm">
                                                    <CheckCircle2 size={12} /> Firma
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700 px-2.5 py-1 rounded-xl text-xs font-bold border border-gray-100 dark:border-slate-600">
                                                    Sin Firma
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 mt-1 border-t border-gray-50 dark:border-slate-700/50 pt-3">
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm truncate">{t.cargo}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-slate-600 inline-block self-start truncate max-w-full">
                                            {t.area}
                                        </div>
                                    </div>
                                    {t.categoria && (
                                        <div className="mt-1">
                                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider border border-purple-200 dark:border-purple-800/50">
                                                {t.categoria}
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-50 dark:border-slate-700/50">
                                        <button onClick={() => handleEdit(t)} className="flex items-center justify-center gap-2 p-2.5 text-amber-600 dark:text-amber-500 font-bold text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-800/50 active:scale-95 transition-all">
                                            <Edit size={14} /> Editar
                                        </button>
                                        <button onClick={() => handleDeleteClick(t)} className="flex items-center justify-center gap-2 p-2.5 text-red-600 dark:text-red-500 font-bold text-xs bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-800/50 active:scale-95 transition-all">
                                            <Trash2 size={14} /> Eliminar
                                        </button>
                                        {t.firma_url && (
                                            <button onClick={() => handleDeleteFirmaClick(t)} className="col-span-2 mt-1 flex items-center justify-center gap-2 p-2 text-gray-500 dark:text-gray-400 text-xs bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">
                                                <Eraser size={14} /> Borrar Firma
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* --- VISTA ESCRITORIO (TABLA TRADICIONAL) --- */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">DNI</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Apellidos y Nombres</th>
                                        <th className="px-6 py-4 whitespace-nowrap">Cargo / Área</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Firma</th>
                                        <th className="px-6 py-4 text-right rounded-tr-xl whitespace-nowrap">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/60 dark:divide-slate-700/60">
                                    {itemsActuales.map(t => (
                                        <tr key={t.id_trabajador} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/40 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 font-bold">{t.dni}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-100">{t.apellidos} {t.nombres}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                <div className="font-bold text-gray-700 dark:text-gray-300">{t.cargo}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.area}</div>
                                                {t.categoria && (
                                                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded mt-1 inline-block font-bold border border-purple-200 dark:border-purple-800/50">
                                                        {t.categoria}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {t.firma_url ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800/50">
                                                            <CheckCircle2 size={12} /> Sí
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeleteFirmaClick(t)}
                                                            className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                            title="Borrar firma"
                                                        >
                                                            <Eraser size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 text-xs font-medium bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-700">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(t)} title="Editar" className="p-2 text-amber-600 dark:text-amber-500 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-slate-700 shadow-sm active:scale-95 transition-all rounded-xl"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteClick(t)} title="Eliminar" className="p-2 text-red-600 dark:text-red-500 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-slate-700 shadow-sm active:scale-95 transition-all rounded-xl"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Paginación */}
                {filtrados.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Página {paginaActual} de {totalPaginas}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="p-2 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="p-2 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EXCEL */}
            {
                modalExcelOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="text-green-600 dark:text-green-500" /> Importar Excel
                                </h3>
                                <button onClick={() => setModalExcelOpen(false)}><X className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" /></button>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm mb-6 border border-blue-100 dark:border-blue-800/50">
                                <p className="font-bold mb-1">Instrucciones:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Sube el reporte de Nisira (CSV o Excel).</li>
                                    <li>El sistema limpiará y unirá las líneas rotas automáticamente.</li>
                                    <li>Actualizará DNI, Nombres, Cargo, Área y Categoría (EDS, CIFHS).</li>
                                </ul>
                            </div>

                            <form onSubmit={handleUploadExcel} className="space-y-4">
                                <input type="file" required accept=".csv, .xlsx, .xls" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 transition-colors" />

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
                                    <button type="button" onClick={() => setModalExcelOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-transparent dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors">Cancelar</button>
                                    <button type="submit" disabled={subiendoExcel} className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold flex items-center gap-2 disabled:opacity-50 transition-colors">
                                        {subiendoExcel ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                        {subiendoExcel ? "Procesando..." : "Importar Ahora"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* MODAL INDIVIDUAL */}
            {
                modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    {editingId ? <Edit className="text-amber-500" /> : <Users className="text-blue-500" />}
                                    {editingId ? 'Editar' : 'Nuevo'} Trabajador
                                </h3>
                                <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" /></button>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">DNI</label><input {...register("dni", { required: true })} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" /></div>
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">Género</label><select {...register("genero")} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">Apellidos</label><input {...register("apellidos", { required: true })} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" /></div>
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">Nombres</label><input {...register("nombres", { required: true })} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">Cargo</label><input {...register("cargo")} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" /></div>
                                    <div><label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 block">Área</label><input {...register("area")} className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" /></div>
                                </div>

                                {/* Input Firma Individual */}
                                <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-100 mt-2">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Firma Digital</label>
                                    <div className="flex items-center gap-3">
                                        <input type="hidden" {...register("firma_url")} />
                                        <input type="file" id="firma-upload" className="hidden" accept="image/*" onChange={handleUploadFirma} />
                                        {watch('firma_url') ? (
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-bold bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg border border-green-100 dark:border-green-800/50">
                                                <CheckCircle2 size={18} /> Cargada con éxito
                                                <button type="button" onClick={() => setValue('firma_url', '')} className="text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 p-1 rounded-md transition-colors ml-2"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <label htmlFor="firma-upload" className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-500 rounded-xl hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 font-bold text-sm transition-colors shadow-sm">
                                                {uploadingFirma ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                                                {uploadingFirma ? "Subiendo..." : "Adjuntar Archivo"}
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700 mt-6">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl font-bold transition-colors">Cancelar</button>
                                    <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 shadow-md transition-colors"><Save size={18} /> Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
}