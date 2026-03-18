// frontend/app/dashboard/capacitaciones/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, SubmitErrorHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { getEmpresaConfig } from '@/services/empresa.service';
import { AxiosError } from 'axios';
import Select from 'react-select';
import { useTheme } from 'next-themes';
import {
    ArrowLeft, Save, UserPlus, Trash2, FileText, Clock, Briefcase,
    Building2, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon,
    PenTool, Camera, X, UserCheck, UserX, AlertCircle, BarChart3, PieChart, Users, Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import SignaturePad from '@/components/ui/SignaturePad';
import { uploadImageToLocal, uploadBase64 } from '@/services/upload.service';
import EvaluacionesTab from '@/components/EvaluacionesTab';

const getImageUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.includes('[object Object]')) return "";
    if (url.startsWith("http")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.split('/api')[0] || 'http://localhost:4000';
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
};

const normalizar = (texto: any) => {
    if (typeof texto !== 'string') return '';
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const getColorBarra = (porcentaje: number) => {
    if (porcentaje < 50) return 'bg-red-500';
    if (porcentaje < 85) return 'bg-amber-400';
    return 'bg-green-500';
};

// 🟢 Conversión a WebP
const convertirAWebp = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No se pudo crear el contexto del canvas');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const newFile = new File([blob], newName, { type: 'image/webp' });
                    resolve(newFile);
                } else {
                    reject('Error al convertir a WebP');
                }
            }, 'image/webp', 0.8);
        };
        img.onerror = (error) => reject(error);
    });
};

interface PlanItem {
    tema: string;
    clasificacion: string;
    areas_objetivo?: string;
    objetivo?: string;
    categoria?: string;
}

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
    id_capacitacion: number;
    tipo: string;
    url: string;
    nombre_archivo?: string;
    fecha_generado?: string;
}

interface TrabajadorSelect {
    dni: string;
    nombres: string;
    apellidos: string;
    area: string;
    cargo: string;
    genero: string;
    categoria?: string;
    firma_url?: string;
}

interface SelectOption {
    value: string;
    label: string;
    datos?: TrabajadorSelect;
}

interface EvaluacionData {
    id_evaluacion: number;
    titulo: string;
    tipo: string;
    estado: boolean;
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
    expositor_firma: string | FileList | File;
    institucion_procedencia: string;
    area_objetivo: string;
    participantes: {
        numero: number;
        dni: string;
        apellidos_nombres: string;
        area: string;
        cargo: string;
        genero: string;
        condicion: string;
        firma_url?: string;
    es_maestra?: boolean;
    }[];
};

export default function EditarCapacitacionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingRow, setUploadingRow] = useState<number | null>(null);
    const { user, loading: authLoading } = useAuth();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const esAuditor = user?.rol === 'auditor';

    useEffect(() => {
        setMounted(true);
    }, []);

    const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: 'error' | 'exito', texto: string } | null>(null);

    const [mainTab, setMainTab] = useState<'detalle' | 'evaluaciones'>('detalle');
    const [listTab, setListTab] = useState<'asistentes' | 'faltantes'>('asistentes');

    const [faltantes, setFaltantes] = useState<TrabajadorFaltante[]>([]);
    const [evidenciasNuevas, setEvidenciasNuevas] = useState<File[]>([]);
    const [fotosExistentes, setFotosExistentes] = useState<DocumentoExistente[]>([]);
    const [uploadingExpositor, setUploadingExpositor] = useState(false);
    const [evaluaciones, setEvaluaciones] = useState<EvaluacionData[]>([]);

    const [planes, setPlanes] = useState<PlanItem[]>([]);
    const [sugerencias, setSugerencias] = useState<PlanItem[]>([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const [modoFirma, setModoFirma] = useState<'subir' | 'pantalla'>('subir');
    const signaturePadRef = useRef<SignatureCanvas>(null);
    const [indiceFirmaActiva, setIndiceFirmaActiva] = useState<number | null>(null);
    const workerPadRef = useRef<SignatureCanvas>(null);
    const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);
    const [listaTrabajadores, setListaTrabajadores] = useState<TrabajadorSelect[]>([]);

    const { register, control, handleSubmit, setValue, watch, reset, setError, setFocus, formState: { errors } } = useForm<Inputs>();
    const { fields, append, remove, replace, update } = useFieldArray({ control, name: "participantes" });
    const participantesWatch = watch('participantes');

    useEffect(() => {
        const loadData = async () => {
            if (authLoading) return;
            try {
                const [config, trabajadoresRes, planesRes] = await Promise.all([
                    getEmpresaConfig(),
                    api.get('/trabajadores/listado'),
                    api.get('/gestion/temas')
                ]);
                setEmpresaConfig(config);
                setListaTrabajadores(trabajadoresRes.data);
                setPlanes(planesRes.data);

                const { data } = await api.get(`/capacitaciones/${id}`);

                if (data.documentos) setFotosExistentes(data.documentos.filter((d: DocumentoExistente) => d.tipo === 'EVIDENCIA_FOTO'));
                if (data.faltantes) setFaltantes(data.faltantes);

                const fechaFormat = data.fecha ? new Date(data.fecha).toISOString().split('T')[0] : '';
                const horaInicioFormat = data.hora_inicio ? (data.hora_inicio.length > 5 ? new Date(data.hora_inicio).toTimeString().slice(0, 5) : data.hora_inicio) : '';
                const horaTerminoFormat = data.hora_termino ? (data.hora_termino.length > 5 ? new Date(data.hora_termino).toTimeString().slice(0, 5) : data.hora_termino) : '';

                reset({
                    ...data,
                    institucion_procedencia: data.institucion_procedencia || null,
                    expositor_firma: data.expositor_firma || '',
                    revision_usada: data.revision_usada || config.revision_actual || '06',
                    fecha: fechaFormat,
                    hora_inicio: horaInicioFormat,
                    hora_termino: horaTerminoFormat,
                    participantes: data.participantes || [],
                    area_objetivo: data.area_objetivo || ''
                });
                if (data.evaluaciones) setEvaluaciones(data.evaluaciones);
            } catch (error) {
                console.error("Error cargando:", error);
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        loadData();

        function handleClickOutside(event: MouseEvent) {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setMostrarSugerencias(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [id, authLoading, router, reset]);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const webpFiles = await Promise.all(files.map(file => convertirAWebp(file)));
            setEvidenciasNuevas(prev => [...prev, ...webpFiles]);
        }
    };
    const removeEvidenciaNueva = (index: number) => setEvidenciasNuevas(prev => prev.filter((_, i) => i !== index));
    const removeFotoExistente = async (id_doc: number) => {
        if (!confirm("¿Borrar esta foto?")) return;
        try { setFotosExistentes(prev => prev.filter(f => f.id_documento !== id_doc)); } catch (e) { console.error(e); }
    };

    const temaRegister = register("tema_principal", { required: true });
    const handleTemaSearch = (texto: string) => {
        if (texto.length > 1) {
            const coincidencias = planes.filter(p => p.tema.toLowerCase().includes(texto.toLowerCase()));
            setSugerencias(coincidencias);
            setMostrarSugerencias(true);
        } else {
            setMostrarSugerencias(false);
        }
    };

    const seleccionarTema = (plan: PlanItem) => {
        setValue('tema_principal', (plan.tema || '').trim(), { shouldValidate: true });

        const tipoActividad = (plan.clasificacion || '').toLowerCase();
        let actividadFinal = 'Capacitación';
        if (tipoActividad.includes('inducci')) actividadFinal = 'Inducción';
        else if (tipoActividad.includes('taller')) actividadFinal = 'Taller';
        else if (tipoActividad.includes('charla')) actividadFinal = 'Charla';
        else if (tipoActividad.includes('simulacro')) actividadFinal = 'Simulacro';
        else if (tipoActividad.includes('entrenamiento')) actividadFinal = 'Entrenamiento';
        setValue('actividad', actividadFinal, { shouldValidate: true });

        let categoriaFinal = 'Otros';
        if (plan.categoria) {
            const catNormalizada = normalizar(plan.categoria);
            if (catNormalizada.includes('social')) categoriaFinal = 'Responsabilidad Social';
            else if (catNormalizada.includes('ambiente')) categoriaFinal = 'Medio Ambiente';
            else if (catNormalizada.includes('inocuidad')) categoriaFinal = 'Inocuidad';
            else if (catNormalizada.includes('seguridad') || catNormalizada.includes('sst')) categoriaFinal = 'Seguridad';
            else if (catNormalizada.includes('cadena')) categoriaFinal = 'Cadena';
            else if (catNormalizada.includes('gobernanza')) categoriaFinal = 'Gobernanza';
        }
        setValue('categoria', categoriaFinal, { shouldValidate: true });
        setValue('area_objetivo', plan.areas_objetivo || '');
        if (plan.objetivo) setValue('objetivo', plan.objetivo);
        setValue('modalidad', 'Interna', { shouldValidate: true });
        setMostrarSugerencias(false);
    };

    const sedeSeleccionada = watch('sede_empresa');

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

        const opcionesNombres = trabajadoresFiltrados.map(t => ({
            value: String(t.dni).padStart(8, '0'),
            label: `${t.apellidos} ${t.nombres}`,
            datos: t
        }));
        const opcionesDNI = trabajadoresFiltrados.map(t => ({
            value: String(t.dni).padStart(8, '0'),
            label: String(t.dni).padStart(8, '0'),
            datos: t
        }));

        return { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles };
    };

    const autocompletarFila = (index: number, trabajador: TrabajadorSelect) => {
        if (!trabajador) return;
        const yaExiste = participantesWatch.some((p, i) => {
            if (i === index || !p.dni) return false;
            return String(p.dni).padStart(8, '0') === String(trabajador.dni).padStart(8, '0');
        });

        if (yaExiste) {
            setMensajeAlerta({ tipo: 'error', texto: `El trabajador ${trabajador.apellidos} ${trabajador.nombres} ya está en la lista.` });
            update(index, { ...participantesWatch[index], dni: '', apellidos_nombres: '' });
            return;
        }

        const dniLimpio = String(trabajador.dni).padStart(8, '0');
        const generoNorm = trabajador.genero ? trabajador.genero.toUpperCase() : 'M';

        update(index, {
            ...participantesWatch[index],
            dni: dniLimpio,
            apellidos_nombres: `${trabajador.apellidos} ${trabajador.nombres}`,
            area: trabajador.area,
            cargo: trabajador.cargo,
            genero: generoNorm,
            firma_url: trabajador.firma_url || participantesWatch[index].firma_url || '',
            es_maestra: !!trabajador.firma_url
        });
    };

    const cargarTrabajadoresDeArea = () => {
        const areaObjetivo = watch('area_objetivo');
        if (!areaObjetivo) {
            setMensajeAlerta({ tipo: 'error', texto: "Primero selecciona un tema para saber a qué áreas cargar." });
            return;
        }

        const areasBusqueda = areaObjetivo.split(',').map(a => normalizar(a.trim()));
        const diccionario: Record<string, string[]> = {
            "rrhh": ["recursos humanos", "personal", "rrhh", "social"],
            "sig": ["sig", "sistema de gestion", "integrado", "calidad", "sso"],
            "logistica": ["logistica", "almacen", "compras", "adquisiciones"],
            "planificacion": ["planificacion", "planeamiento", "control"],
            "mantenimiento": ["mecanizacion", "taller", "mantenimiento", "maquinaria"],
            "mecanizacion": ["mecanizacion", "taller", "mantenimiento"],
            "cifhs": ["cifhs", "hostigamiento", "comite", "genero"],
            "eds": ["eds", "desempeño social"],
            "scsst": ["scsst", "comite", "seguridad y salud", "csst"],
            "administrativos": ["recursos humanos", "personal", "rrhh", "sig", "logistica", "planificacion", "administracion"]
        };

        const sugeridos = listaTrabajadores.filter(t => {
            const areaT = normalizar(t.area);
            const catT = normalizar(t.categoria || "");
            return areasBusqueda.some(aPlan => {
                if (diccionario[aPlan]) {
                    return diccionario[aPlan].some(sinonimo => areaT.includes(sinonimo) || catT.includes(sinonimo));
                }
                return areaT.includes(aPlan) || catT.includes(aPlan);
            });
        });

        if (sugeridos.length === 0) {
            setMensajeAlerta({ tipo: 'error', texto: "No se encontraron trabajadores para: " + areaObjetivo });
            return;
        }

        const hayDatosPrevios = fields.length > 0 && (fields.length > 1 || participantesWatch[0].dni !== "");
        let debeReemplazar = false;

        if (hayDatosPrevios) {
            if (confirm(`Ya hay personas en la lista.\n\n[ACEPTAR] = Reemplazar por los ${sugeridos.length} nuevos.\n[CANCELAR] = Agregar al final.`)) {
                debeReemplazar = true;
            }
        } else {
            if (!confirm(`Se detectaron ${sugeridos.length} trabajadores. ¿Cargar ahora?`)) return;
            debeReemplazar = true;
        }

        const nuevasFilas = sugeridos.map((t, i) => ({
            numero: debeReemplazar ? i + 1 : fields.length + i + 1,
            dni: String(t.dni).padStart(8, '0'),
            apellidos_nombres: `${t.apellidos} ${t.nombres}`,
            area: t.area,
            cargo: t.cargo,
            genero: t.genero || 'M',
            condicion: '',
            firma_url: t.firma_url || ''
        }));

        if (debeReemplazar) replace(nuevasFilas);
        else append(nuevasFilas);
    };

    const handleUploadFirma = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingRow(index);
        try {
            const webpFile = await convertirAWebp(file);
            const url = await uploadImageToLocal(webpFile);
            if (url) setValue(`participantes.${index}.firma_url`, url, { shouldValidate: true });
        }
        finally { setUploadingRow(null); }
    };

    const abrirModalFirma = (index: number) => setIndiceFirmaActiva(index);
    const cerrarModalFirma = () => setIndiceFirmaActiva(null);

    const guardarFirmaModal = async () => {
        if (workerPadRef.current && !workerPadRef.current.isEmpty() && indiceFirmaActiva !== null) {
            const canvas = workerPadRef.current.getCanvas();

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
                tempCtx.fillStyle = "#ffffff";
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(canvas, 0, 0);
            }

            const base64 = tempCanvas.toDataURL('image/webp', 0.8);
            const dni = participantesWatch[indiceFirmaActiva].dni || 'sin_dni';

            const url = await uploadBase64(base64, `firma_trab_${dni}_${Date.now()}.webp`);

            if (url) {
                setValue(`participantes.${indiceFirmaActiva}.firma_url`, url, {
                    shouldValidate: true,
                    shouldDirty: true
                });
            }
            cerrarModalFirma();
        }
    };

    const handleUploadFirmaExpositor = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadingExpositor(true);
            try {
                const webpFile = await convertirAWebp(file);
                const url = await uploadImageToLocal(webpFile);
                if (url) setValue('expositor_firma', url);
            } catch (error) {
                console.error(error);
                setMensajeAlerta({ tipo: 'error', texto: "Error al subir firma expositor" });
            } finally {
                setUploadingExpositor(false);
            }
        }
    };

    const recargarEvaluaciones = async () => {
        try {
            const { data } = await api.get(`/capacitaciones/${id}`);
            if (data.evaluaciones) {
                setEvaluaciones(data.evaluaciones);
            }
        } catch (error) {
            console.error("Error al recargar evaluaciones:", error);
        }
    };

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        if (esAuditor) return;

        setSaving(true);
        setMensajeAlerta(null);
        try {
            const formData = new FormData();

            if (modoFirma === 'pantalla' && signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                const pad = signaturePadRef.current;
                const canvas = pad.getCanvas();

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');

                if (tempCtx) {
                    tempCtx.fillStyle = "#ffffff";
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempCtx.drawImage(canvas, 0, 0);
                }

                const base64 = tempCanvas.toDataURL('image/webp', 0.8);
                const urlFirmaExpositor = await uploadBase64(base64, `firma_expositor_${Date.now()}.webp`);

                if (urlFirmaExpositor) {
                    formData.append('expositor_firma', urlFirmaExpositor);
                }

            } else if (data.expositor_firma && (data.expositor_firma as unknown as FileList)[0] instanceof File) {
                const fileList = data.expositor_firma as unknown as FileList;
                formData.append('expositor_firma', fileList[0]);
            } else if (data.expositor_firma && typeof data.expositor_firma === 'string') {
                formData.append('expositor_firma', data.expositor_firma);
            }

            (Object.keys(data) as Array<keyof Inputs | string>).forEach((key) => {
                if (
                    key !== 'participantes' &&
                    key !== 'expositor_firma' &&
                    key !== 'evaluaciones' &&
                    key !== 'documentos' &&
                    key !== 'faltantes'
                ) {
                    // @ts-expect-error ignoramos tipado dinamico
                    const val = data[key];
                    if (val !== undefined && val !== null) {
                        formData.append(key, String(val));
                    }
                }
            });

            const participantesData = data.participantes.map((p, i) => ({
                ...p,
                numero: i + 1,
                firma_url: p.firma_url || null,
            }));

            formData.append('participantes', JSON.stringify(participantesData));

            evidenciasNuevas.forEach((file) => {
                formData.append('evidencias', file);
            });

            const response = await api.put(`/capacitaciones/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.status === 200 || response.status === 201) {
                setMensajeAlerta({ tipo: 'exito', texto: '¡Capacitación actualizada correctamente! 🔄' });
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                setTimeout(() => router.push('/dashboard'), 2000);
            }

        } catch (error: unknown) {
            console.error("🔥 Error:", error);
            let msg = 'Error desconocido al actualizar';

            if (error instanceof AxiosError) {
                const apiError = error.response?.data?.error || error.response?.data?.message || error.message;
                msg = apiError;

                const textoError = String(apiError).toLowerCase();
                if (textoError.includes('código de acta') || textoError.includes('duplicad') || textoError.includes('registrado')) {
                    msg = "El Código de Acta ingresado ya existe. Por favor, usa uno diferente.";
                    setError("codigo_acta", { type: "manual", message: "Código duplicado" });
                    setTimeout(() => setFocus("codigo_acta"), 100);
                }
            } else if (error instanceof Error) {
                msg = error.message;
            }

            setMensajeAlerta({ tipo: 'error', texto: msg });
            setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        } finally {
            setSaving(false);
        }
    };

    const onError: SubmitErrorHandler<Inputs> = (e) => {
        console.error("Errores de validación:", e);
        setMensajeAlerta({ tipo: 'error', texto: "Faltan campos obligatorios. Revisa los recuadros resaltados en rojo." });
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    };

    const isDark = mounted && theme === 'dark';

    const customStyles = {
        control: (base: Record<string, unknown>) => ({
            ...base,
            minHeight: '30px',
            fontSize: '12px',
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#f8fafc' : '#1e293b'
        }),
        singleValue: (base: Record<string, unknown>) => ({
            ...base,
            color: isDark ? '#f8fafc' : '#1e293b'
        }),
        input: (base: Record<string, unknown>) => ({
            ...base,
            margin: 0,
            padding: 0,
            color: isDark ? '#f8fafc' : '#1e293b'
        }),
        menu: (base: Record<string, unknown>) => ({
            ...base,
            zIndex: 9999,
            backgroundColor: isDark ? '#1e293b' : 'white',
        }),
        option: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
            ...base,
            backgroundColor: state.isFocused
                ? (isDark ? '#334155' : '#f1f5f9')
                : (isDark ? '#1e293b' : 'white'),
            color: isDark ? '#f8fafc' : '#1e293b',
            cursor: 'pointer'
        })
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 relative px-4">

            {/* 🟢 BANNER DE ALERTAS FLOTANTE */}
            {mensajeAlerta && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-100 w-[95%] max-w-md p-4 rounded-xl flex items-start gap-3 shadow-2xl border transition-all animate-in slide-in-from-top-8 fade-in ${mensajeAlerta.tipo === 'error' ? 'bg-white dark:bg-slate-900 border-red-500 text-red-800 dark:text-red-200' : 'bg-white dark:bg-slate-900 border-green-500 text-green-800 dark:text-green-200'}`}>
                    <div className={`p-2 rounded-full ${mensajeAlerta.tipo === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {mensajeAlerta.tipo === 'error' ? <AlertCircle className="text-red-600 dark:text-red-400" size={24} /> : <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h4 className="font-extrabold text-sm">{mensajeAlerta.tipo === 'error' ? 'Acción Requerida' : 'Operación Exitosa'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{mensajeAlerta.texto}</p>
                    </div>
                    <button type="button" onClick={() => setMensajeAlerta(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            )}

            {/* MODAL FIRMA TRABAJADOR */}
            {!esAuditor && indiceFirmaActiva !== null && (
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 dark:bg-slate-900/50 px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <PenTool size={20} className="text-blue-500" /> Firma Digital
                            </h3>
                            <button type="button" onClick={cerrarModalFirma} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900/20">
                            <div className="border-2 border-dashed rounded-xl bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-700 overflow-hidden shadow-inner">
                                <SignaturePad ref={workerPadRef} />
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-3 uppercase font-bold tracking-widest leading-none">Firma dentro del recuadro</p>
                        </div>
                        <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button type="button" onClick={() => workerPadRef.current?.clear()} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-red-500 font-bold text-sm transition-colors">Limpiar</button>
                            <button type="button" onClick={guardarFirmaModal} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">Aceptar Firma</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition"><ArrowLeft className="text-gray-600 dark:text-gray-400" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{esAuditor ? 'Ver Capacitación' : 'Editar Capacitación'}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>ID: {id}</span><span>•</span><span>{empresaConfig?.codigo_formato}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-widest">Rev:</span>
                    <input disabled={esAuditor} {...register("revision_usada")} className="w-12 bg-transparent border-b border-yellow-400 dark:border-yellow-600 text-sm font-bold text-center outline-none text-yellow-800 dark:text-yellow-200" />
                </div>
            </div>

            {/* SECCIÓN 1: PANEL DE ESTADÍSTICAS */}
            <div className="animate-in fade-in space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-blue-500/30 group">
                        <div><p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">Hombres</p><h3 className="text-3xl font-black text-blue-700 dark:text-blue-300 tabular-nums">{watch('total_hombres') || 0}</h3></div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><UserCheck size={28} /></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-pink-100 dark:border-pink-900/20 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-pink-500/30 group">
                        <div><p className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-widest mb-1">Mujeres</p><h3 className="text-3xl font-black text-pink-700 dark:text-pink-300 tabular-nums">{watch('total_mujeres') || 0}</h3></div>
                        <div className="bg-pink-50 dark:bg-pink-900/30 p-3 rounded-2xl text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform"><UserCheck size={28} /></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-slate-500/30 group">
                        <div><p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Asistentes</p><h3 className="text-3xl font-black text-slate-700 dark:text-slate-200 tabular-nums">{watch('total_trabajadores') || 0}</h3></div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform"><Users size={28} /></div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex-1 shadow-sm">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/30"><PieChart size={20} /></div><h4 className="font-bold text-blue-900 dark:text-blue-300">Cobertura de la Sesión</h4></div>
                        <div className="flex items-end gap-2"><span className="text-4xl font-black text-blue-700 dark:text-blue-400">{porcentajeGlobal}%</span><span className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-1">del personal convocado</span></div>
                        <div className="w-full bg-white/60 dark:bg-slate-900/50 h-3 rounded-full mt-4 overflow-hidden"><div className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-1000 shadow-inner" style={{ width: `${porcentajeGlobal}%` }}></div></div>
                        <div className="mt-3 text-xs text-blue-800 dark:text-blue-300 flex justify-between font-bold tracking-wide"><span>Asistentes: {asistentesGlobal}</span><span>Convocados (Total): {totalGlobal}</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-5 flex items-center gap-2 uppercase tracking-widest text-sm border-b border-gray-50 dark:border-slate-700 pb-3"><BarChart3 size={18} className="text-blue-500" /> Detalle por Área Involucrada</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {statsPorArea.map((stat, idx) => (
                            <div key={idx} className="bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 p-4 rounded-xl hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm truncate w-1/2" title={stat.area}>{stat.area}</span>
                                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider ${stat.porcentaje === 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600'}`}>{stat.asistentes} / {stat.total}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${getColorBarra(stat.porcentaje)}`} style={{ width: `${stat.porcentaje}%` }}></div></div>
                                    <span className="text-xs font-black w-8 text-right dark:text-gray-300">{stat.porcentaje}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {statsPorArea.length === 0 && <p className="text-center text-gray-400 dark:text-slate-500 py-6 text-sm font-medium">No hay datos suficientes para generar estadísticas.</p>}
                </div>
            </div>

            {/* 🟢 TABS DE NAVEGACIÓN MODERNIZADOS */}
            <div className="flex gap-2 mb-6 mt-6 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl w-fit border border-gray-200 dark:border-slate-700">
                <button
                    onClick={() => setMainTab('detalle')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'detalle' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    📝 Detalle y Asistencia
                </button>
                <button
                    onClick={() => setMainTab('evaluaciones')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${mainTab === 'evaluaciones' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    🧠 Evaluaciones
                </button>
            </div>

            {mainTab === 'evaluaciones' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <EvaluacionesTab
                        idCapacitacion={Number(id)}
                        evaluacionesExistentes={evaluaciones}
                        onRecargar={recargarEvaluaciones}
                    />
                </div>
            ) : (

                /* --- FORMULARIO PRINCIPAL --- */
                <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <input type="hidden" {...register("area_objetivo")} />

                    {/* SECTION 1: SEDE Y CÓDIGO */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                            <Building2 size={20} /> <h3 className="uppercase tracking-widest text-sm">Información de Sede</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-3 tracking-widest">Sede de Ejecución</label>
                                <div className="flex gap-4">
                                    <label className={`flex flex-1 items-center gap-3 border-2 p-4 rounded-2xl transition-all ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${sedeSeleccionada === 'Majes' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-4 ring-blue-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                        <input type="radio" disabled={esAuditor} value="Majes" {...register("sede_empresa")} className="accent-blue-600 w-4 h-4" />
                                        <span className="font-bold text-gray-700 dark:text-gray-200">PEDREGAL - MAJES</span>
                                    </label>
                                    <label className={`flex flex-1 items-center gap-3 border-2 p-4 rounded-2xl transition-all ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${sedeSeleccionada === 'Olmos' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-4 ring-blue-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                        <input type="radio" disabled={esAuditor} value="Olmos" {...register("sede_empresa")} className="accent-blue-600 w-4 h-4" />
                                        <span className="font-bold text-gray-700 dark:text-gray-200">TIERRAS NUEVAS - OLMOS</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.codigo_acta ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Código de Acta Oficial <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-600"><FileText size={18} /></div>
                                        <input
                                            disabled={esAuditor}
                                            {...register("codigo_acta", { required: "El código es obligatorio" })}
                                            className={`w-full border-2 rounded-2xl pl-10 pr-3 py-3 font-mono font-bold outline-none transition-all disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 ${errors.codigo_acta ? 'border-red-500 bg-red-50 dark:bg-red-950/20 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent focus:border-blue-500 dark:text-blue-100'}`}
                                            placeholder="ACT-YYYY-XXX"
                                        />
                                    </div>
                                </div>
                                {errors.codigo_acta && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase animate-pulse">{errors.codigo_acta.message as string}</span>}
                            </div>
                        </div>
                    </div>

                    {/* 2. DETALLES */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Clock size={20} /> <h3 className="font-bold">Detalles de la Sesión</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8 relative" ref={autocompleteRef}>
                                <label className={`block text-sm font-medium mb-1 ${errors.tema_principal ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                    Tema Principal <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        disabled={esAuditor}
                                        {...temaRegister}
                                        onChange={(e) => { temaRegister.onChange(e); handleTemaSearch(e.target.value); }}
                                        className={`w-full border-2 rounded-xl pl-10 pr-3 py-2.5 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-gray-100 outline-none transition-all disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 ${errors.tema_principal
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-200 dark:ring-red-900/50 text-red-900 dark:text-red-200'
                                            : 'border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
                                            }`}
                                        placeholder="Buscar tema..."
                                        autoComplete="off"
                                    />
                                    <Search className={`absolute left-3 top-3 ${errors.tema_principal ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                                </div>
                                {errors.tema_principal && <span className="text-red-500 text-xs mt-1 block">Debes seleccionar o escribir un tema</span>}
                                {mostrarSugerencias && sugerencias.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                        <ul>{sugerencias.map((plan, index) => (
                                            <li key={index} onClick={() => seleccionarTema(plan)} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-none transition-colors group">
                                                <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{plan.tema}</div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {plan.areas_objetivo && plan.areas_objetivo.split(',').map((areaStr: string, i: number) => (
                                                        <span key={i} className="text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">{areaStr.trim()}</span>
                                                    ))}
                                                </div>
                                            </li>
                                        ))}</ul>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actividad Económica</label>
                                <div className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-100 dark:bg-slate-900/30 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    {empresaConfig?.actividad_economica}
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className={`block text-sm font-medium mb-1 ${errors.fecha ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>Fecha <span className="text-red-500">*</span></label>
                                <input disabled={esAuditor} type="date" {...register("fecha", { required: true })} className={`w-full border-2 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 ${errors.fecha ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`} />
                                {errors.fecha && <span className="text-red-500 text-xs mt-1 block">Obligatorio</span>}
                            </div>
                            <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label><input disabled={esAuditor} type="time" {...register("hora_inicio")} className="w-full border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" /></div>
                            <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Término</label><input disabled={esAuditor} type="time" {...register("hora_termino")} className="w-full border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" /></div>
                            <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Horas</label><input disabled={esAuditor} {...register("total_horas")} className="w-full border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-gray-50 dark:bg-slate-900/30 dark:text-gray-100 outline-none disabled:opacity-60 dark:disabled:bg-slate-900" /></div>

                            <div className="md:col-span-12"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo</label><textarea disabled={esAuditor} {...register("objetivo")} rows={2} className="w-full border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" /></div>
                            <div className="md:col-span-12"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temario</label><textarea disabled={esAuditor} {...register("temario")} rows={3} className="w-full border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" /></div>
                        </div>
                    </div>

                    {/* 3. CLASIFICACIÓN */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                            <FileText size={20} /> <h3 className="uppercase tracking-widest text-sm">Clasificación de Actividad</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.actividad ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Tipo de Actividad <span className="text-red-500">*</span></label>
                                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 rounded-2xl border-2 transition-all ${errors.actividad ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                    {['Inducción', 'Capacitación', 'Entrenamiento', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (
                                        <label key={op} className={`flex items-center gap-2 ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} group`}>
                                            <input disabled={esAuditor} type="radio" value={op} {...register("actividad", { required: true })} className="accent-blue-600 w-4 h-4" />
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{op}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.actividad && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase">Selección requerida</span>}
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.categoria ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Categoría del Evento <span className="text-red-500">*</span></label>
                                    <select disabled={esAuditor} {...register("categoria", { required: true })} className={`w-full border-2 rounded-2xl px-4 py-3 font-bold outline-none transition-all disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 ${errors.categoria ? 'border-red-500 bg-red-50 dark:bg-red-950/20 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent focus:border-blue-500 dark:text-white'}`}>
                                        <option value="" className="dark:bg-slate-800">-- Seleccionar Categoría --</option>
                                        <option value="Seguridad" className="dark:bg-slate-800">Seguridad y Salud</option>
                                        <option value="Inocuidad" className="dark:bg-slate-800">Inocuidad Alimentaria</option>
                                        <option value="Cadena" className="dark:bg-slate-800">Cadena de Suministro (BASC)</option>
                                        <option value="Medio Ambiente" className="dark:bg-slate-800">Gestión Ambiental</option>
                                        <option value="Responsabilidad Social" className="dark:bg-slate-800">Responsabilidad Social</option>
                                        <option value="Gobernanza" className="dark:bg-slate-800">Gobernanza y Ética</option>
                                        <option value="Otros" className="dark:bg-slate-800">Otros Temas</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.modalidad ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Modalidad <span className="text-red-500">*</span></label>
                                        <div className={`flex p-1 rounded-xl border-2 transition-all ${errors.modalidad ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                            <label className={`flex-1 text-center py-2 rounded-lg font-bold text-sm transition-all has-checked:bg-blue-600 has-checked:text-white text-gray-500 ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input disabled={esAuditor} type="radio" value="Interna" {...register("modalidad", { required: true })} className="hidden" /> Interna
                                            </label>
                                            <label className={`flex-1 text-center py-2 rounded-lg font-bold text-sm transition-all has-checked:bg-blue-600 has-checked:text-white text-gray-500 ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input disabled={esAuditor} type="radio" value="Externa" {...register("modalidad", { required: true })} className="hidden" /> Externa
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.accion_correctiva ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>A. Correctiva <span className="text-red-500">*</span></label>
                                        <div className={`flex p-1 rounded-xl border-2 transition-all ${errors.accion_correctiva ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                            <label className={`flex-1 text-center py-2 rounded-lg font-bold text-sm transition-all has-checked:bg-red-500 has-checked:text-white text-gray-500 ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input disabled={esAuditor} type="radio" value="SI" {...register("accion_correctiva", { required: true })} className="hidden" /> SI
                                            </label>
                                            <label className={`flex-1 text-center py-2 rounded-lg font-bold text-sm transition-all has-checked:bg-green-600 has-checked:text-white text-gray-500 ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input disabled={esAuditor} type="radio" value="NO" {...register("accion_correctiva", { required: true })} className="hidden" /> NO
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8">
                            <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.centros ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Lugar / Centro de Capacitación <span className="text-red-500">*</span></label>
                            <div className={`flex flex-wrap gap-2 p-4 rounded-2xl border-2 transition-all ${errors.centros ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                {['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Comedor', 'Sala de Reuniones', 'E-Learning', 'Otros'].map(c => (
                                    <label key={c} className={`px-4 py-2 rounded-xl border-2 font-bold text-xs transition-all ${esAuditor ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${watch('centros') === c ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500 hover:border-blue-500/50'}`}>
                                        <input disabled={esAuditor} type="radio" value={c} {...register("centros", { required: true })} className="hidden" /> {c}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. EXPOSITOR */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                            <Briefcase size={20} /> <h3 className="uppercase tracking-widest text-sm">Información del Expositor</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Nombre Completo</label>
                                <input disabled={esAuditor} {...register("expositor_nombre")} placeholder="Ej: Juan Perez" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Documento DNI</label>
                                <input disabled={esAuditor} {...register("expositor_dni")} placeholder="8 dígitos" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" />
                            </div>
                        </div>
                        <div className="space-y-1 mb-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Empresa / Institución</label>
                            <input disabled={esAuditor} {...register("institucion_procedencia")} placeholder="Nombre de la empresa" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900" />
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">Firma del Expositor</label>
                                {!esAuditor && (
                                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border dark:border-slate-700">
                                        <button type="button" onClick={() => setModoFirma('subir')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${modoFirma === 'subir' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                            <ImageIcon size={14} /> SUBIR IMAGEN
                                        </button>
                                        <button type="button" onClick={() => setModoFirma('pantalla')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${modoFirma === 'pantalla' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                            <PenTool size={14} /> DIBUJAR FIRMA
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="min-h-[140px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30 overflow-hidden">
                                {watch('expositor_firma') ? (
                                    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300 p-2">
                                        <div className="relative h-24 w-64 bg-white border dark:border-slate-700 rounded-xl p-2 shadow-sm flex items-center justify-center">
                                            {(() => {
                                                const imageUrl = getImageUrl(watch('expositor_firma') as string);
                                                if (!imageUrl) {
                                                    return <div className="text-gray-400 text-[10px] italic">Sin firma registrada</div>;
                                                }
                                                return (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={imageUrl} alt="Firma Expositor" className="max-h-full max-w-full object-contain" />
                                                );
                                            })()}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm mt-1">
                                            <CheckCircle2 size={16} /> Firmada con éxito
                                            {!esAuditor && (
                                                <button type="button" onClick={() => setValue('expositor_firma', '')} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full text-red-500 transition ml-2">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    !esAuditor ? (
                                        modoFirma === 'subir' ? (
                                            <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center p-8 group transition-all">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-500 p-4 rounded-2xl group-hover:scale-110 transition-transform mb-3">
                                                    {uploadingExpositor ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                                                </div>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Click para cargar imagen</span>
                                                <input type="file" className="hidden" onChange={handleUploadFirmaExpositor} accept="image/*" />
                                            </label>
                                        ) : (
                                            <div className="w-full bg-white dark:bg-white/10 p-2">
                                                <SignaturePad ref={signaturePadRef} />
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest font-bold">No se registró firma</span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. TABLA DE PARTICIPANTES */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700" >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-50 dark:border-slate-700 pb-4">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
                                <Users size={20} /> <h3 className="uppercase tracking-widest text-sm">Control de Asistencia</h3>
                            </div>

                            {/* 🟢 RESTAURAMOS LOS TABS DE ASISTENTES Y FALTANTES */}
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
                                <button type="button" onClick={() => setListTab('asistentes')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${listTab === 'asistentes' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    <UserCheck size={16} /> Asistentes ({fields.length})
                                </button>
                                <button type="button" onClick={() => setListTab('faltantes')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${listTab === 'faltantes' ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    <UserX size={16} /> Faltantes ({faltantes.length})
                                </button>
                            </div>
                        </div>

                        {/* VISTA B: ASISTENTES (TABLA INTELIGENTE) */}
                        {listTab === 'asistentes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex flex-wrap gap-2 mb-4 justify-end">
                                    {!esAuditor && watch('area_objetivo') && (
                                        <button type="button" onClick={cargarTrabajadoresDeArea} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-xs font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95">
                                            <UserCheck size={16} /> AUTOCOMPLETAR ({watch('area_objetivo')})
                                        </button>
                                    )}
                                    {!esAuditor && (
                                        <button type="button" onClick={() => { if (confirm("¿Estás seguro de vaciar toda la lista?")) { replace([{ numero: 1, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' }]); } }} className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-100 transition-all text-xs font-bold">
                                            <Trash2 size={16} /> LIMPIAR LISTA
                                        </button>
                                    )}
                                </div>

                                {/* 🟢 SE LE DIO MÁS ANCHO A LA COLUMNA FIRMA (col-span-2) Y MENOS A NOMBRES (col-span-3) */}
                                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2 uppercase px-2">
                                    <div className="col-span-1 text-center font-black">#</div>
                                    <div className="col-span-2">DNI / ID</div>
                                    <div className="col-span-3">Nombres y Apellidos</div>
                                    <div className="col-span-2">Área</div>
                                    <div className="col-span-2">Cargo</div>
                                    <div className="col-span-2 text-center">Firma / Acciones</div>
                                </div>

                                <div className="space-y-2">
                                    {fields.map((item, index) => {
                                        const { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles } = getOpcionesFila(index);
                                        return (
                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-gray-50/50 dark:bg-slate-900/40 p-2 rounded-2xl border border-gray-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-all group">
                                                <div className="col-span-1 font-black text-center text-gray-300 dark:text-slate-700">{index + 1}</div>
                                                <div className="col-span-2">
                                                    <Controller name={`participantes.${index}.dni`} control={control} render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            isDisabled={esAuditor}
                                                            options={opcionesDNI}
                                                            placeholder="DNI..."
                                                            onChange={(val: SelectOption | null) => {
                                                                field.onChange(val?.value);
                                                                if (val?.datos) autocompletarFila(index, val.datos);
                                                            }}
                                                            value={opcionesDNI.find(op => op.value === field.value)}
                                                            styles={customStyles}
                                                            noOptionsMessage={() => "No encontrado"}
                                                        />
                                                    )} />
                                                </div>
                                                <div className="col-span-3"> {/* 🟢 AHORA ES COL-SPAN-3 */}
                                                    <Controller name={`participantes.${index}.apellidos_nombres`} control={control} render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            isDisabled={esAuditor}
                                                            options={opcionesNombres}
                                                            placeholder="Buscar por nombre..."
                                                            onChange={(val: SelectOption | null) => {
                                                                field.onChange(val?.label);
                                                                if (val?.datos) autocompletarFila(index, val.datos);
                                                            }}
                                                            value={opcionesNombres.find(op => op.label === field.value)}
                                                            styles={customStyles}
                                                        />
                                                    )} />
                                                </div>
                                                <div className="col-span-2">
                                                    <Controller name={`participantes.${index}.area`} control={control} render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            isDisabled={esAuditor}
                                                            options={areasDisponibles}
                                                            placeholder="Área"
                                                            onChange={(val: SelectOption | null) => {
                                                                field.onChange(val?.value);
                                                                setValue(`participantes.${index}.cargo`, '');
                                                            }}
                                                            value={areasDisponibles.find(a => a.value === field.value)}
                                                            styles={customStyles}
                                                        />
                                                    )} />
                                                </div>
                                                <div className="col-span-2">
                                                    <Controller name={`participantes.${index}.cargo`} control={control} render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            isDisabled={esAuditor || !watch(`participantes.${index}.area`)}
                                                            options={cargosDisponibles}
                                                            placeholder="Cargo"
                                                            onChange={(val: SelectOption | null) => field.onChange(val?.value)}
                                                            value={cargosDisponibles.find(op => op.value === field.value)}
                                                            styles={customStyles}
                                                        />
                                                    )} />
                                                </div>

                                                {/* 🟢 AHORA ES COL-SPAN-2 Y TIENE BOTÓN PARA BORRAR SOLO LA FIRMA */}
                                                <div className="col-span-2 flex justify-center items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {watch(`participantes.${index}.firma_url`) ? (
                                                        <div className="flex items-center gap-1">
                                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg" title="Firma Registrada">
                                                                <CheckCircle2 size={16} />
                                                            </div>

                                                            {!esAuditor && !(participantesWatch[index] as any).es_maestra && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setValue(`participantes.${index}.firma_url`, '')}
                                                                    className="p-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-500 hover:text-orange-600 rounded-lg transition-colors"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        !esAuditor && (
                                                            <>
                                                                <label className={`cursor-pointer p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:text-blue-600 transition-colors ${uploadingRow === index ? 'opacity-50 pointer-events-none' : ''}`} title="Subir firma">
                                                                    <input type="file" className="hidden" disabled={uploadingRow === index} onChange={(e) => handleUploadFirma(index, e)} />
                                                                    {uploadingRow === index ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <UploadCloud size={16} />}
                                                                </label>
                                                                <button type="button" onClick={() => abrirModalFirma(index)} className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:text-purple-600 transition-colors" title="Dibujar firma">
                                                                    <PenTool size={16} />
                                                                </button>
                                                            </>
                                                        )
                                                    )}

                                                    {/* SEPARADOR Y BOTÓN DE BORRAR FILA */}
                                                    {!esAuditor && (
                                                        <>
                                                            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                                                            <button type="button" onClick={() => remove(index)} className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors" title="Eliminar trabajador">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {!esAuditor && (
                                    <button type="button" onClick={() => append({ numero: 0, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' })} className="mt-4 w-full py-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-gray-400 dark:text-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold uppercase text-[10px] tracking-[0.2em]">
                                        <UserPlus size={18} /> AGREGAR NUEVO PARTICIPANTE
                                    </button>
                                )}
                            </div>
                        )}

                        {/* VISTA C: FALTANTES */}
                        {listTab === 'faltantes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {faltantes.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                                        <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                                        <p className="font-bold">¡Excelente!</p>
                                        <p className="text-sm">Todos asistieron a la capacitación.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {faltantes.map((f) => (
                                            <div key={f.dni} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-red-950 text-red-500 flex items-center justify-center font-bold border border-red-200 dark:border-red-800"><AlertCircle size={20} /></div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate" title={`${f.apellidos} ${f.nombres}`}>{f.apellidos}, {f.nombres}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{f.cargo} • {f.dni}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 6: EVIDENCIAS FOTOGRÁFICAS */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                            <Camera size={20} /> <h3 className="uppercase tracking-widest text-sm">Evidencias Fotográficas</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {!esAuditor && (
                                <label className="aspect-square relative border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50 hover:border-blue-500 transition-all group">
                                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-500 p-3 rounded-xl group-hover:scale-110 transition-transform mb-2"><Camera size={24} /></div>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Añadir Fotos</span>
                                </label>
                            )}

                            {/* Fotos Existentes de la BD */}
                            {fotosExistentes.map(f => (
                                <div key={f.id_documento} className="aspect-square relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={getImageUrl(f.url)} alt="Evidencia Existente" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <a href={getImageUrl(f.url)} target="_blank" rel="noopener noreferrer" className="bg-white text-gray-800 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                            <Camera size={16} />
                                        </a>
                                        {!esAuditor && (
                                            <button type="button" onClick={() => removeFotoExistente(f.id_documento)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Fotos Nuevas que se subirán */}
                            {evidenciasNuevas.map((f, i) => (
                                <div key={i} className="aspect-square relative rounded-2xl overflow-hidden border-2 border-blue-400 dark:border-blue-600 group shadow-sm animate-in zoom-in-95 duration-300">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={URL.createObjectURL(f)} alt="Nueva evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-0 left-0 bg-blue-600 text-[10px] tracking-widest text-white px-2 py-0.5 font-bold rounded-br-lg z-10 shadow-sm">NUEVA</div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button type="button" onClick={() => removeEvidenciaNueva(i)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN FINAL */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4 border-t border-gray-100 dark:border-slate-800">
                        <button type="button" onClick={() => router.back()} className="px-8 py-3.5 border-2 border-gray-100 dark:border-slate-800 rounded-2xl text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all font-bold uppercase tracking-widest text-xs">
                            {esAuditor ? 'VOLVER' : 'CANCELAR'}
                        </button>
                        {!esAuditor && (
                            <button type="submit" disabled={saving} className="px-12 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group tracking-widest text-xs uppercase">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                                {saving ? 'Actualizando...' : 'ACTUALIZAR ACTA'}
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}