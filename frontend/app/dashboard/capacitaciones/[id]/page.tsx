'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, SubmitErrorHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/services/api';
import { getEmpresaConfig } from '@/services/empresa.service';
import { AxiosError } from 'axios';
import Select from 'react-select';
import {
    ArrowLeft, Save, UserPlus, Trash2, FileText, Clock, Briefcase,
    Building2, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon,
    PenTool, Camera, X, UserCheck, UserX, AlertCircle, BarChart3, PieChart, Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import SignaturePad from '@/components/ui/SignaturePad';
import { uploadImageToLocal, uploadBase64 } from '@/services/upload.service';

// --- UTILIDADES ---
const normalizar = (texto: string | undefined | null) => {
    return (texto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const getColorBarra = (porcentaje: number) => {
    if (porcentaje < 50) return 'bg-red-500';
    if (porcentaje < 85) return 'bg-amber-400';
    return 'bg-green-500';
};

// --- INTERFACES ---
interface TrabajadorFaltante {
    id_trabajador: number;
    dni: string;
    nombres: string;
    apellidos: string;
    cargo: string;
    area: string;
}

interface EmpresaConfig {
    codigo_formato: string;
    ruc: string;
    direccion_majes: string;
    direccion_olmos: string;
    actividad_economica: string;
    revision_actual: string;
    nombre: string;
}

interface DocumentoExistente {
    id_documento: number;
    url: string;
    tipo: string;
}

interface TrabajadorSelect {
    dni: string;
    nombres: string;
    apellidos: string;
    area: string;
    cargo: string;
    genero: string;
    firma_url?: string;
}

interface SelectOption {
    value: string;
    label: string;
    datos?: TrabajadorSelect;
}

type Inputs = {
    codigo_acta: string;
    tema_principal: string;
    temario: string;
    objetivo: string;
    sede_empresa: string;
    revision_usada: string;
    total_hombres: number;
    total_mujeres: number;
    total_trabajadores: number;
    actividad: string;
    accion_correctiva: string;
    modalidad: string;
    categoria: string;
    centros: string;
    fecha: string;
    hora_inicio: string;
    hora_termino: string;
    total_horas: string;
    expositor_nombre: string;
    expositor_dni: string;
    expositor_firma: string;
    institucion_procedencia: string;
    area_objetivo?: string;
    participantes: {
        numero: number;
        dni: string;
        apellidos_nombres: string;
        area: string;
        cargo: string;
        genero: string;
        condicion: string;
        firma_url?: string;
    }[];
};

export default function EditarCapacitacionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingRow, setUploadingRow] = useState<number | null>(null);
    const { user, loading: authLoading } = useAuth();

    const esAuditor = user?.rol === 'Auditor';

    // ESTADOS
    // AHORA LAS PESTAÑAS SOLO SON PARA PERSONAS (Arranca en Asistentes)
    const [activeTab, setActiveTab] = useState<'asistentes' | 'faltantes'>('asistentes');

    const [faltantes, setFaltantes] = useState<TrabajadorFaltante[]>([]);
    const [evidenciasNuevas, setEvidenciasNuevas] = useState<File[]>([]);
    const [fotosExistentes, setFotosExistentes] = useState<DocumentoExistente[]>([]);
    const [uploadingExpositor, setUploadingExpositor] = useState(false);

    const [modoFirma, setModoFirma] = useState<'subir' | 'pantalla'>('subir');
    const signaturePadRef = useRef<SignatureCanvas>(null);
    const [indiceFirmaActiva, setIndiceFirmaActiva] = useState<number | null>(null);
    const workerPadRef = useRef<SignatureCanvas>(null);
    const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);
    const [listaTrabajadores, setListaTrabajadores] = useState<TrabajadorSelect[]>([]);

    const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Inputs>();
    const { fields, append, remove } = useFieldArray({ control, name: "participantes" });
    const participantesWatch = watch('participantes');

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const loadData = async () => {
            if (authLoading) return;
            try {
                const [config, trabajadoresRes] = await Promise.all([
                    getEmpresaConfig(),
                    api.get('/trabajadores/listado')
                ]);
                setEmpresaConfig(config);
                setListaTrabajadores(trabajadoresRes.data);

                const { data } = await api.get(`/capacitaciones/${id}`);

                if (data.documentos) setFotosExistentes(data.documentos.filter((d: DocumentoExistente) => d.tipo === 'EVIDENCIA_FOTO'));
                if (data.faltantes) setFaltantes(data.faltantes);

                const fechaFormat = data.fecha ? new Date(data.fecha).toISOString().split('T')[0] : '';
                const horaInicioFormat = data.hora_inicio ? (data.hora_inicio.length > 5 ? new Date(data.hora_inicio).toTimeString().slice(0, 5) : data.hora_inicio) : '';
                const horaTerminoFormat = data.hora_termino ? (data.hora_termino.length > 5 ? new Date(data.hora_termino).toTimeString().slice(0, 5) : data.hora_termino) : '';

                reset({
                    ...data,
                    institucion_procedencia: data.expositor_institucion || '',
                    revision_usada: data.revision_usada || config.revision_actual || '06',
                    fecha: fechaFormat,
                    hora_inicio: horaInicioFormat,
                    hora_termino: horaTerminoFormat,
                    participantes: data.participantes || []
                });
            } catch (error) {
                console.error("Error cargando:", error);
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, authLoading, user, router, reset]);

    // --- CÁLCULO DE GÉNERO ---
    useEffect(() => {
        if (!participantesWatch) return;
        let hombres = 0;
        let mujeres = 0;
        participantesWatch.forEach(p => {
            if (p.dni) {
                const generoRaw = String(p.genero || '').trim().toUpperCase();
                if (['M', 'MASCULINO', 'HOMBRE'].includes(generoRaw)) hombres++;
                else if (['F', 'FEMENINO', 'MUJER'].includes(generoRaw)) mujeres++;
            }
        });
        setValue('total_hombres', hombres);
        setValue('total_mujeres', mujeres);
        setValue('total_trabajadores', hombres + mujeres);
    }, [participantesWatch, setValue]);

    // --- CÁLCULO DE ESTADÍSTICAS VISUALES ---
    const statsPorArea = useMemo(() => {
        const map: Record<string, { total: number; asistentes: number }> = {};
        if (participantesWatch) {
            participantesWatch.forEach(p => {
                const area = p.area || 'Sin Área';
                if (!map[area]) map[area] = { total: 0, asistentes: 0 };
                map[area].total++;
                map[area].asistentes++;
            });
        }
        faltantes.forEach(f => {
            const area = f.area || 'Sin Área';
            if (!map[area]) map[area] = { total: 0, asistentes: 0 };
            map[area].total++;
        });
        return Object.entries(map).map(([area, datos]) => ({
            area,
            asistentes: datos.asistentes,
            total: datos.total,
            porcentaje: datos.total > 0 ? Math.round((datos.asistentes / datos.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);
    }, [participantesWatch, faltantes]);

    const totalGlobal = statsPorArea.reduce((acc, curr) => acc + curr.total, 0);
    const asistentesGlobal = statsPorArea.reduce((acc, curr) => acc + curr.asistentes, 0);
    const porcentajeGlobal = totalGlobal > 0 ? Math.round((asistentesGlobal / totalGlobal) * 100) : 0;

    // --- FUNCIONES AUXILIARES ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setEvidenciasNuevas(prev => [...prev, ...files]);
        }
    };
    const removeEvidenciaNueva = (index: number) => setEvidenciasNuevas(prev => prev.filter((_, i) => i !== index));
    const removeFotoExistente = async (id_doc: number) => {
        if (!confirm("¿Borrar esta foto?")) return;
        try { setFotosExistentes(prev => prev.filter(f => f.id_documento !== id_doc)); } catch (e) { console.error(e); }
    };

    // --- LOGICA TABLA INTELIGENTE ---
    const getOpcionesFila = (index: number) => {
        const filaActual = participantesWatch[index];
        const areaSeleccionada = filaActual?.area;
        const cargoSeleccionado = filaActual?.cargo;

        let trabajadoresFiltrados = listaTrabajadores;

        if (areaSeleccionada) {
            const areaBusqueda = normalizar(areaSeleccionada);
            trabajadoresFiltrados = trabajadoresFiltrados.filter(t => normalizar(t.area) === areaBusqueda);
        }
        if (cargoSeleccionado) {
            const cargoBusqueda = normalizar(cargoSeleccionado);
            trabajadoresFiltrados = trabajadoresFiltrados.filter(t => normalizar(t.cargo) === cargoBusqueda);
        }

        const areasUnicas = Array.from(new Set(listaTrabajadores.map(t => t.area).filter(Boolean))).sort();
        const areasDisponibles = areasUnicas.map(a => ({ value: a, label: a }));

        const baseParaCargos = areaSeleccionada
            ? listaTrabajadores.filter(t => normalizar(t.area) === normalizar(areaSeleccionada))
            : listaTrabajadores;
        const cargosUnicos = Array.from(new Set(baseParaCargos.map(t => t.cargo).filter(Boolean))).sort();
        const cargosDisponibles = cargosUnicos.map(c => ({ value: c, label: c }));

        const opcionesNombres = trabajadoresFiltrados.map(t => ({ value: t.dni, label: `${t.apellidos} ${t.nombres}`, datos: t }));
        const opcionesDNI = trabajadoresFiltrados.map(t => ({ value: t.dni, label: t.dni, datos: t }));

        return { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles };
    };

    const autocompletarFila = (index: number, trabajador: TrabajadorSelect) => {
        if (!trabajador) return;

        // --- VALIDACIÓN ANTI-DUPLICADOS ---
        // Buscamos si el DNI ya existe en otra fila (ignorando la fila actual que estamos editando)
        const yaExiste = participantesWatch.some((p, i) => i !== index && p.dni === trabajador.dni);

        if (yaExiste) {
            alert(`⚠️ ¡Atención! El trabajador ${trabajador.apellidos} ${trabajador.nombres} ya está en la lista.`);

            // Limpiamos los campos para impedir la selección
            setValue(`participantes.${index}.dni`, '');
            setValue(`participantes.${index}.apellidos_nombres`, '');
            return; // Cortamos la función aquí
        }

        // --- SI NO EXISTE, PROCEDEMOS NORMALMENTE ---
        setValue(`participantes.${index}.dni`, trabajador.dni);
        setValue(`participantes.${index}.apellidos_nombres`, `${trabajador.apellidos} ${trabajador.nombres}`);
        setValue(`participantes.${index}.area`, trabajador.area);
        setValue(`participantes.${index}.cargo`, trabajador.cargo);

        const generoNorm = trabajador.genero ? trabajador.genero.toUpperCase() : 'M';
        setValue(`participantes.${index}.genero`, generoNorm);

        if (trabajador.firma_url) setValue(`participantes.${index}.firma_url`, trabajador.firma_url);
    };

    // --- FIRMAS ---
    const handleUploadFirma = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingRow(index);
        try { const url = await uploadImageToLocal(file); if (url) setValue(`participantes.${index}.firma_url`, url); }
        finally { setUploadingRow(null); }
    };
    const abrirModalFirma = (index: number) => setIndiceFirmaActiva(index);
    const cerrarModalFirma = () => setIndiceFirmaActiva(null);
    const guardarFirmaModal = async () => {
        if (workerPadRef.current && !workerPadRef.current.isEmpty() && indiceFirmaActiva !== null) {
            const base64 = workerPadRef.current.getTrimmedCanvas().toDataURL('image/png');
            const dni = participantesWatch[indiceFirmaActiva].dni || 'sin_dni';
            const url = await uploadBase64(base64, `firma_trab_${dni}_${Date.now()}.png`);
            setValue(`participantes.${indiceFirmaActiva}.firma_url`, url);
            cerrarModalFirma();
        }
    };
    const handleUploadFirmaExpositor = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadingExpositor(true);
            try {
                const url = await uploadImageToLocal(file);
                if (url) setValue('expositor_firma', url);
            } catch (error) {
                console.error(error);
                alert("Error al subir firma expositor");
            } finally {
                setUploadingExpositor(false);
            }
        }
    };

    // --- SUBMIT ---
    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        if (esAuditor) return;
        setSaving(true);
        try {
            let firmaExpositorUrl = data.expositor_firma;
            if (modoFirma === 'pantalla' && signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                const base64 = signaturePadRef.current.getTrimmedCanvas().toDataURL('image/png');
                firmaExpositorUrl = await uploadBase64(base64, `firma_expositor_${Date.now()}.png`);
            }
            const formData = new FormData();
            (Object.keys(data) as Array<keyof Inputs>).forEach((key) => {
                if (key !== 'participantes' && key !== 'expositor_firma') {
                    const val = data[key];
                    if (val !== undefined && val !== null) formData.append(key, String(val));
                }
            });
            if (firmaExpositorUrl) formData.append('expositor_firma', firmaExpositorUrl);
            const participantesData = data.participantes.map((p, i) => ({ ...p, numero: i + 1, firma_url: p.firma_url || null }));
            formData.append('participantes', JSON.stringify(participantesData));
            evidenciasNuevas.forEach((file) => formData.append('evidencias', file));

            await api.put(`/capacitaciones/${id}`, formData);
            alert('¡Capacitación actualizada correctamente!');
            window.location.href = '/dashboard';
        } catch (error: unknown) {
            console.error(error);
            let msg = 'Error desconocido';
            if (error instanceof AxiosError) msg = error.response?.data?.error || error.message;
            alert('Error al actualizar: ' + msg);
        } finally {
            setSaving(false);
        }
    };

    const onError: SubmitErrorHandler<Inputs> = (e) => {
        console.error("Errores de validación:", e);
        alert("Faltan campos obligatorios. Revisa los bordes rojos.");
    };

    const customStyles = {
        control: (base: Record<string, unknown>) => ({ ...base, minHeight: '30px', fontSize: '12px' }),
        input: (base: Record<string, unknown>) => ({ ...base, margin: 0, padding: 0 }),
        menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 })
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
            {/* Modal Firma */}
            {!esAuditor && indiceFirmaActiva !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-100 px-4 py-3 border-b flex justify-between">
                            <h3 className="font-bold flex gap-2"><PenTool size={18} /> Firma: {participantesWatch[indiceFirmaActiva]?.apellidos_nombres}</h3>
                            <button onClick={cerrarModalFirma}><X size={24} /></button>
                        </div>
                        <div className="p-4 bg-white"><div className="border-2 border-dashed rounded-lg bg-gray-50"><SignaturePad ref={workerPadRef} /></div></div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => workerPadRef.current?.clear()} className="px-4 py-2 text-gray-600 border rounded-lg">Limpiar</button>
                            <button onClick={guardarFirmaModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Aceptar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full"><ArrowLeft className="text-gray-600" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{esAuditor ? 'Ver Capacitación' : 'Editar Capacitación'}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500"><span>ID: {id}</span><span>•</span><span>{empresaConfig?.codigo_formato}</span></div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-700 uppercase">Rev:</span>
                    <input disabled={esAuditor} {...register("revision_usada")} className="w-12 bg-transparent border-b border-yellow-400 text-sm font-bold text-center outline-none" />
                </div>
            </div>

            {/* SECCIÓN 1: PANEL DE ESTADÍSTICAS (ENCABEZADO) */}
            <div className="animate-in fade-in space-y-4">
                {/* TARJETAS DE CONTEO RÁPIDO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-bold text-blue-500 uppercase">Hombres</p>
                            <h3 className="text-3xl font-bold text-blue-700">{watch('total_hombres')}</h3>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600"><UserCheck size={24} /></div>
                    </div>
                    <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-bold text-pink-500 uppercase">Mujeres</p>
                            <h3 className="text-3xl font-bold text-pink-700">{watch('total_mujeres')}</h3>
                        </div>
                        <div className="bg-pink-100 p-3 rounded-full text-pink-600"><UserCheck size={24} /></div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
                            <h3 className="text-3xl font-bold text-gray-700">{watch('total_trabajadores')}</h3>
                        </div>
                        <div className="bg-gray-100 p-3 rounded-full text-gray-600"><Users size={24} /></div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* CARD COBERTURA */}
                    <div className="bg-linear-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 flex-1 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 text-white rounded-lg"><PieChart size={20} /></div>
                            <h4 className="font-bold text-blue-900">Cobertura de la Sesión</h4>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-blue-700">{porcentajeGlobal}%</span>
                            <span className="text-sm text-blue-600 mb-1">del personal convocado</span>
                        </div>
                        <div className="w-full bg-white/50 h-2 rounded-full mt-3 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${porcentajeGlobal}%` }}></div>
                        </div>
                        <div className="mt-2 text-xs text-blue-800 flex justify-between font-medium">
                            <span>Asistentes: {asistentesGlobal}</span>
                            <span>Convocados (Total): {totalGlobal}</span>
                        </div>
                    </div>
                </div>

                {/* BARRAS POR ÁREA */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Detalle por Área Involucrada</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {statsPorArea.map((stat, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 p-3 rounded-lg hover:shadow-md transition">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-700 text-sm truncate w-1/2" title={stat.area}>{stat.area}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${stat.porcentaje === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {stat.asistentes} / {stat.total}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-1000 ${getColorBarra(stat.porcentaje)}`}
                                            style={{ width: `${stat.porcentaje}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold w-8 text-right">{stat.porcentaje}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {statsPorArea.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No hay datos suficientes para generar estadísticas.</p>}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 mt-6">

                {/* 2. DATOS GENERALES */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Building2 size={20} /><h3 className="font-bold">Datos Generales</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sede Principal</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 border p-3 rounded-lg w-full ${esAuditor ? 'opacity-70' : 'cursor-pointer'} ${watch('sede_empresa') === 'Majes' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                    <input type="radio" disabled={esAuditor} value="Majes" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">MAJES</span>
                                </label>
                                <label className={`flex items-center gap-2 border p-3 rounded-lg w-full ${esAuditor ? 'opacity-70' : 'cursor-pointer'} ${watch('sede_empresa') === 'Olmos' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                    <input type="radio" disabled={esAuditor} value="Olmos" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">OLMOS</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código Acta</label>
                            <input disabled={esAuditor} {...register("codigo_acta", { required: true })} className={`w-full border rounded px-3 py-2 bg-gray-50 font-mono text-blue-900 ${errors.codigo_acta ? 'border-red-500' : ''}`} />
                        </div>
                    </div>
                </div>

                {/* 3. DETALLES */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Clock size={20} /><h3 className="font-bold">Detalles de la Sesión</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tema Principal</label>
                            <input disabled={esAuditor} {...register("tema_principal", { required: true })} className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-400 mb-1">Actividad Económica</label>
                            <div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500 text-sm">{empresaConfig?.actividad_economica}</div>
                        </div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Fecha <span className="text-red-500">*</span></label><input type="date" disabled={esAuditor} {...register("fecha", { required: true })} className={`w-full border rounded px-3 py-2 ${errors.fecha ? 'border-red-500' : ''}`} /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Inicio <span className="text-red-500">*</span></label><input type="time" disabled={esAuditor} {...register("hora_inicio", { required: true })} className={`w-full border rounded px-3 py-2 ${errors.hora_inicio ? 'border-red-500' : ''}`} /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Término <span className="text-red-500">*</span></label><input type="time" disabled={esAuditor} {...register("hora_termino", { required: true })} className={`w-full border rounded px-3 py-2 ${errors.hora_termino ? 'border-red-500' : ''}`} /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Total Horas</label><input disabled={esAuditor} {...register("total_horas")} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium mb-1">Objetivo</label><textarea disabled={esAuditor} {...register("objetivo")} rows={2} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium mb-1">Temario</label><textarea disabled={esAuditor} {...register("temario")} rows={3} className="w-full border rounded px-3 py-2" /></div>
                    </div>
                </div>

                {/* 4. CLASIFICACIÓN */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><FileText size={20} /><h3 className="font-bold">Clasificación</h3></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">Actividad</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Inducción', 'Capacitación', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (<label key={op} className="flex items-center gap-2"><input type="radio" disabled={esAuditor} value={op} {...register("actividad", { required: true })} /> {op}</label>))}
                            </div>
                            {errors.actividad && <span className="text-red-500 text-xs">Requerido</span>}
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">Categoría</label>
                            <select disabled={esAuditor} {...register("categoria", { required: true })} className="w-full border rounded px-2 py-1.5"><option value="">-- Seleccionar --</option><option value="Seguridad">Seguridad</option><option value="Inocuidad">Inocuidad</option><option value="Cadena">Cadena Suministro</option><option value="Medio Ambiente">Medio Ambiente</option><option value="Responsabilidad Social">Resp. Social</option><option value="Otros">Otros</option></select>
                            {errors.categoria && <span className="text-red-500 text-xs">Requerido</span>}
                        </div>
                        <div className="flex gap-8">
                            <div><label className="block font-bold mb-2">Modalidad</label><div className="flex gap-3"><label><input type="radio" disabled={esAuditor} value="Interna" {...register("modalidad", { required: true })} /> Interna</label><label><input type="radio" disabled={esAuditor} value="Externa" {...register("modalidad", { required: true })} /> Externa</label></div></div>
                            <div><label className="block font-bold mb-2">Acción Correctiva</label><div className="flex gap-3"><label><input type="radio" disabled={esAuditor} value="SI" {...register("accion_correctiva", { required: true })} /> SI</label><label><input type="radio" disabled={esAuditor} value="NO" {...register("accion_correctiva", { required: true })} /> NO</label></div></div>
                        </div>
                        <div>
                            <label className="block font-bold mb-2">Centros / Lugar</label>
                            <div className="flex flex-wrap gap-3">
                                {['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Otros'].map(c => (<label key={c} className="flex gap-1"><input type="radio" disabled={esAuditor} value={c} {...register("centros", { required: true })} /> {c}</label>))}
                            </div>
                            {errors.centros && <span className="text-red-500 text-xs">Requerido</span>}
                        </div>
                    </div>
                </div>

                {/* 5. EXPOSITOR Y FOTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex gap-2"><Briefcase size={18} /> Datos del Expositor</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input disabled={esAuditor} {...register("expositor_nombre")} placeholder="Nombre Completo" className="w-full border rounded px-3 py-2 text-sm" />
                                <input disabled={esAuditor} {...register("expositor_dni")} placeholder="DNI" className="w-full border rounded px-3 py-2 text-sm" />
                            </div>
                            <input disabled={esAuditor} {...register("institucion_procedencia")} placeholder="Institución" className="w-full border rounded px-3 py-2 text-sm" />
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center">
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Firma Expositor</span>
                                {watch('expositor_firma') ? (
                                    <div className="flex items-center justify-center gap-2 text-green-600"><CheckCircle2 size={16} /> Firmada {!esAuditor && <button type="button" onClick={() => setValue('expositor_firma', '')}><Trash2 size={14} className="text-red-500" /></button>}</div>
                                ) : (!esAuditor ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex justify-center gap-2">
                                            <button type="button" onClick={() => setModoFirma('subir')} className={`text-xs border px-3 py-1 rounded ${modoFirma === 'subir' ? 'bg-blue-50 border-blue-200' : ''}`}><ImageIcon size={16} className="inline mr-1" /> Subir</button>
                                            <button type="button" onClick={() => setModoFirma('pantalla')} className={`text-xs border px-3 py-1 rounded ${modoFirma === 'pantalla' ? 'bg-blue-50 border-blue-200' : ''}`}><PenTool size={16} className="inline mr-1" /> Firmar</button>
                                        </div>
                                        {modoFirma === 'subir' && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="file" onChange={handleUploadFirmaExpositor} className="text-xs" />
                                                {uploadingExpositor && <Loader2 className="animate-spin text-blue-600" size={16} />}
                                            </div>
                                        )}
                                        {modoFirma === 'pantalla' && (
                                            <div className="mt-2 bg-white border border-dashed w-full"><SignaturePad ref={signaturePadRef} /></div>
                                        )}
                                    </div>
                                ) : <span className="text-xs text-gray-400">Pendiente</span>)}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex gap-2"><Camera size={18} /> Evidencias</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {!esAuditor && (
                                <div className="border-2 border-dashed rounded-lg flex items-center justify-center h-24 hover:bg-gray-50 cursor-pointer relative">
                                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Camera className="text-gray-400" />
                                </div>
                            )}
                            {fotosExistentes.map(f => (
                                <div key={f.id_documento} className="relative h-24 border rounded overflow-hidden group">
                                    <Image src={`http://localhost:4000${f.url}`} alt="Evidencia" fill className="object-cover" unoptimized />
                                    {!esAuditor && <button type="button" onClick={() => removeFotoExistente(f.id_documento)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>}
                                </div>
                            ))}
                            {evidenciasNuevas.map((f, i) => (
                                <div key={i} className="relative h-24 border border-blue-300 rounded overflow-hidden group">
                                    <Image src={URL.createObjectURL(f)} alt="Nueva" fill className="object-cover" unoptimized />
                                    {!esAuditor && <button type="button" onClick={() => removeEvidenciaNueva(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"><X size={12} /></button>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. LISTA DE PERSONAS (ASISTENTES Y FALTANTES) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b pb-2 gap-4">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <button type="button" onClick={() => setActiveTab('asistentes')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === 'asistentes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                                <UserCheck size={16} /> Asistentes ({fields.length})
                            </button>
                            <button type="button" onClick={() => setActiveTab('faltantes')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === 'faltantes' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>
                                <UserX size={16} /> Faltantes ({faltantes.length})
                            </button>
                        </div>
                    </div>

                    {/* VISTA B: ASISTENTES (TABLA INTELIGENTE) */}
                    {activeTab === 'asistentes' && (
                        <div className="animate-in fade-in">
                            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2 uppercase px-2">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-2">DNI</div>
                                <div className="col-span-4">Nombres</div>
                                <div className="col-span-2">Área</div>
                                <div className="col-span-2">Cargo</div>
                                <div className="col-span-1 text-center">Firma</div>
                            </div>
                            <div className="space-y-2">
                                {fields.map((item, index) => {
                                    const { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles } = getOpcionesFila(index);
                                    return (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded border text-sm mb-2">
                                            <div className="col-span-1 font-bold text-center">{index + 1}</div>
                                            <div className="col-span-2"><Controller name={`participantes.${index}.dni`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={opcionesDNI} placeholder="DNI" onChange={(val: SelectOption | null) => { field.onChange(val?.value); if (val?.datos) autocompletarFila(index, val.datos); }} value={opcionesDNI.find(op => op.value === field.value)} styles={customStyles} noOptionsMessage={() => "No encontrado"} />} /></div>
                                            <div className="col-span-4"><Controller name={`participantes.${index}.apellidos_nombres`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={opcionesNombres} placeholder="Nombre" onChange={(val: SelectOption | null) => { field.onChange(val?.label); if (val?.datos) autocompletarFila(index, val.datos); }} value={opcionesNombres.find(op => op.label === field.value)} styles={customStyles} />} /></div>

                                            {/* ÁREA DINÁMICA */}
                                            <div className="col-span-2"><Controller name={`participantes.${index}.area`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={areasDisponibles} placeholder="Área" onChange={(val: SelectOption | null) => { field.onChange(val?.label); setValue(`participantes.${index}.cargo`, ''); }} value={areasDisponibles.find(a => a.value === field.value)} styles={customStyles} />} /></div>

                                            {/* CARGO DINÁMICO */}
                                            <div className="col-span-2"><Controller name={`participantes.${index}.cargo`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor || !watch(`participantes.${index}.area`)} options={cargosDisponibles} placeholder="Cargo" onChange={(val: SelectOption | null) => field.onChange(val?.value)} value={cargosDisponibles.find(op => op.value === field.value)} styles={customStyles} />} /></div>

                                            <div className="col-span-1 flex justify-center gap-1">
                                                {watch(`participantes.${index}.firma_url`) ? <CheckCircle2 className="text-green-600" size={18} /> : (!esAuditor && (<><label className={`cursor-pointer ${uploadingRow === index ? 'animate-spin' : ''}`}><input type="file" className="hidden" onChange={(e) => handleUploadFirma(index, e)} /><UploadCloud size={16} className="text-blue-500" /></label><button type="button" onClick={() => abrirModalFirma(index)}><PenTool size={16} className="text-purple-500" /></button></>))}
                                                {!esAuditor && <button type="button" onClick={() => remove(index)}><Trash2 size={16} className="text-red-500" /></button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {!esAuditor && <div className="mt-4 flex justify-center"><button type="button" onClick={() => append({ numero: 0, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' })} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed text-blue-600 rounded-lg hover:bg-blue-50"><UserPlus size={18} /> Agregar Fila</button></div>}
                        </div>
                    )}

                    {/* VISTA C: FALTANTES */}
                    {activeTab === 'faltantes' && (
                        <div className="animate-in fade-in">
                            {faltantes.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed"><CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" /><p className="font-bold">¡Excelente!</p><p className="text-sm">Todos asistieron.</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {faltantes.map((f) => (
                                        <div key={f.id_trabajador} className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center font-bold text-xs border border-red-200"><AlertCircle size={16} /></div>
                                            <div className="overflow-hidden"><p className="font-bold text-gray-800 text-sm truncate" title={`${f.apellidos} ${f.nombres}`}>{f.apellidos}, {f.nombres}</p><p className="text-xs text-gray-500 truncate">{f.cargo} • {f.dni}</p></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* BOTONES */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">{esAuditor ? 'Volver' : 'Cancelar'}</button>
                    {!esAuditor && <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
                        <Save size={20} /> {saving ? 'Guardando...' : 'Actualizar Datos'}
                    </button>}
                </div>
            </form>
        </div>
    );
}