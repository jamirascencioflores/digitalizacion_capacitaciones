// frontend/app/dashboard/capacitaciones/[id]/page.tsx
'use client';
import React from 'react';
import { useState, useEffect, useRef, use, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, SubmitErrorHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { getEmpresaConfig } from '@/services/empresa.service';
import { AxiosError } from 'axios';
import Select from 'react-select';
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

    // Si es Cloudinary (empieza con http), devolver tal cual
    if (url.startsWith("http")) return url;

    // Si es local, construir la ruta usando la URL base del API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.split('/api')[0] || 'http://localhost:4000';
    const cleanPath = url.startsWith("/") ? url : `/${url}`;

    return `${baseUrl}${cleanPath}`;
};

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
    categoria?: string; // 🟢 Agregado
    firma_url?: string;
}

interface SelectOption {
    value: string;
    label: string;
    datos?: TrabajadorSelect;
}

// 🟢 INTERFAZ DE EVALUACIÓN (Para el estado)
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
    expositor_firma: string;
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
    }[];
};

export default function EditarCapacitacionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingRow, setUploadingRow] = useState<number | null>(null);
    const { user, loading: authLoading } = useAuth();

    const esAuditor = user?.rol === 'auditor';

    // 🟢 ESTADOS CORREGIDOS (Nombres distintos)
    // 1. Pestaña Principal (Detalle vs Evaluaciones)
    const [mainTab, setMainTab] = useState<'detalle' | 'evaluaciones'>('detalle');

    // 2. Pestaña de Lista (Asistentes vs Faltantes) - SOLO DENTRO DE DETALLE
    const [listTab, setListTab] = useState<'asistentes' | 'faltantes'>('asistentes');

    const [faltantes, setFaltantes] = useState<TrabajadorFaltante[]>([]);
    const [evidenciasNuevas, setEvidenciasNuevas] = useState<File[]>([]);
    const [fotosExistentes, setFotosExistentes] = useState<DocumentoExistente[]>([]);
    const [uploadingExpositor, setUploadingExpositor] = useState(false);
    const [evaluaciones, setEvaluaciones] = useState<EvaluacionData[]>([]);

    // AUTOCOMPLETE TEMA
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

    const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<Inputs>();
    const { fields, append, remove, replace } = useFieldArray({ control, name: "participantes" });
    const participantesWatch = watch('participantes');

    // --- CARGA DE DATOS ---
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
                    area_objetivo: data.area_objetivo || '' // 🟢 IMPORTANTE: Cargar el área objetivo
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
    }, [id, authLoading, user, router, reset]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const res = await api.get(`/capacitaciones/${id}`);
                const data = res.data;

                // 🟢 Paso A: Llenar el formulario con los nombres del Schema
                reset({
                    ...data,
                    institucion_procedencia: data.institucion_procedencia,
                    expositor_firma: data.expositor_firma || '',
                });

                // 🟢 Paso B: Llenar las evidencias (documentos)
                if (data.documentos) {
                    const evidencias = data.documentos.filter(
                        (doc: DocumentoExistente) => doc.tipo === "EVIDENCIA_FOTO"
                    );
                    setFotosExistentes(evidencias);
                }
            } catch (error) {
                console.error("Error al cargar:", error);
            }
        };
        cargarDatos();
    }, [id, reset]);

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

    // --- AUTOCOMPLETE TEMA ---
    const temaRegister = register("tema_principal", { required: true });
    const handleTemaSearch = (texto: string) => {
        if (texto.length > 1) {
            const coincidencias = planes.filter(p =>
                p.tema.toLowerCase().includes(texto.toLowerCase())
            );
            setSugerencias(coincidencias);
            setMostrarSugerencias(true);
        } else {
            setMostrarSugerencias(false);
        }
    };

    const seleccionarTema = (plan: PlanItem) => {
        // 1. Asignar Nombre y Actividad
        setValue('tema_principal', (plan.tema || '').trim());

        const tipoActividad = (plan.clasificacion || '').toLowerCase();
        let actividadFinal = 'Capacitación';
        if (tipoActividad.includes('inducci')) actividadFinal = 'Inducción';
        else if (tipoActividad.includes('taller')) actividadFinal = 'Taller';
        else if (tipoActividad.includes('charla')) actividadFinal = 'Charla';
        else if (tipoActividad.includes('simulacro')) actividadFinal = 'Simulacro';
        else if (tipoActividad.includes('entrenamiento')) actividadFinal = 'Entrenamiento';
        setValue('actividad', actividadFinal);

        // 3. 🟢 ASIGNAR CATEGORÍA (Desde la columna 'categoria' del Excel/BD)
        let categoriaFinal = 'Otros';

        // Usamos plan.categoria en vez de plan.eje
        if (plan.categoria) {
            const catNormalizada = normalizar(plan.categoria);

            if (catNormalizada.includes('social')) {
                categoriaFinal = 'Responsabilidad Social';
            } else if (catNormalizada.includes('ambiente')) {
                categoriaFinal = 'Medio Ambiente';
            } else if (catNormalizada.includes('inocuidad')) {
                categoriaFinal = 'Inocuidad';
            } else if (catNormalizada.includes('seguridad') || catNormalizada.includes('sst')) {
                categoriaFinal = 'Seguridad';
            } else if (catNormalizada.includes('cadena')) {
                categoriaFinal = 'Cadena';
            } else if (catNormalizada.includes('gobernanza')) {
                categoriaFinal = 'Gobernanza'; // Asegúrate de tener esta opción en tu <select>
            }
        }

        setValue('categoria', categoriaFinal);

        // 4. Asignar Áreas y Objetivo
        if (plan.areas_objetivo) setValue('area_objetivo', plan.areas_objetivo);
        else setValue('area_objetivo', '');

        if (plan.objetivo) setValue('objetivo', plan.objetivo);

        setValue('modalidad', 'Interna');
        setMostrarSugerencias(false);
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

        // 🟢 PADSTART: Asegura que el selector vea los DNI con 8 dígitos
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

        // 🟢 VALIDACIÓN ANTI-DUPLICADOS (CON SOPORTE PARA CEROS)
        const yaExiste = participantesWatch.some((p, i) => {
            if (i === index || !p.dni) return false;
            return String(p.dni).padStart(8, '0') === String(trabajador.dni).padStart(8, '0');
        });

        if (yaExiste) {
            alert(`⚠️ ¡Atención! El trabajador ${trabajador.apellidos} ${trabajador.nombres} ya está en la lista.`);
            setValue(`participantes.${index}.dni`, '');
            setValue(`participantes.${index}.apellidos_nombres`, '');
            return;
        }

        // 🟢 PADSTART: Guardamos siempre con 8 dígitos
        const dniLimpio = String(trabajador.dni).padStart(8, '0');

        setValue(`participantes.${index}.dni`, dniLimpio);
        setValue(`participantes.${index}.apellidos_nombres`, `${trabajador.apellidos} ${trabajador.nombres}`);
        setValue(`participantes.${index}.area`, trabajador.area);
        setValue(`participantes.${index}.cargo`, trabajador.cargo);

        const generoNorm = trabajador.genero ? trabajador.genero.toUpperCase() : 'M';
        setValue(`participantes.${index}.genero`, generoNorm);

        if (trabajador.firma_url) setValue(`participantes.${index}.firma_url`, trabajador.firma_url);
    };

    const cargarTrabajadoresDeArea = () => {
        const areaObjetivo = watch('area_objetivo');
        if (!areaObjetivo) {
            alert("Primero selecciona un tema para saber a qué áreas cargar.");
            return;
        }

        const areasBusqueda = areaObjetivo.split(',').map(a => normalizar(a.trim()));

        // 🟢 DICCIONARIO DE SINÓNIMOS
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
                    return diccionario[aPlan].some(sinonimo =>
                        areaT.includes(sinonimo) || catT.includes(sinonimo)
                    );
                }
                return areaT.includes(aPlan) || catT.includes(aPlan);
            });
        });

        if (sugeridos.length === 0) {
            alert("No se encontraron trabajadores para: " + areaObjetivo);
            return;
        }

        // 🟢 LÓGICA DE REEMPLAZO O AGREGADO
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

        if (debeReemplazar) {
            replace(nuevasFilas);
        } else {
            append(nuevasFilas);
        }
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
            const canvas = workerPadRef.current.getCanvas();
            const base64 = canvas.toDataURL('image/png');

            const dni = participantesWatch[indiceFirmaActiva].dni || 'sin_dni';
            const url = await uploadBase64(base64, `firma_trab_${dni}_${Date.now()}.png`);

            if (url) {
                // 🟢 Actualizamos el valor y forzamos la validación para que se refleje en la lista
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

            // 🟢 FIRMA DEL EXPOSITOR DESDE PANTALLA
            if (
                modoFirma === 'pantalla' &&
                signaturePadRef.current &&
                !signaturePadRef.current.isEmpty()
            ) {
                const canvas = signaturePadRef.current.getCanvas();
                const base64 = canvas.toDataURL('image/png');

                firmaExpositorUrl = await uploadBase64(
                    base64,
                    `firma_expositor_${Date.now()}.png`
                );
            }

            const formData = new FormData();

            // 🟢 CAMPOS SIMPLES
            (Object.keys(data) as Array<keyof Inputs>).forEach((key) => {
                if (key !== 'participantes' && key !== 'expositor_firma') {
                    const val = data[key];
                    if (val !== undefined && val !== null) {
                        formData.append(key, String(val));
                    }
                }
            });

            // 🟢 FIRMA EXPOSITOR (URL)
            if (firmaExpositorUrl) {
                formData.append('expositor_firma', firmaExpositorUrl);
            }

            // 🟢 PARTICIPANTES (OBLIGATORIO)
            const participantesData = data.participantes.map((p, i) => ({
                ...p,
                numero: i + 1,
                firma_url: p.firma_url || null,
            }));

            formData.append(
                'participantes',
                JSON.stringify(participantesData)
            );

            // 🟢 EVIDENCIAS NUEVAS (CLAVE)
            evidenciasNuevas.forEach((file) => {
                formData.append('evidencias', file);
            });

            // 🟢 DEBUG (hazlo una vez)
            for (const pair of formData.entries()) {
                console.log(pair[0], pair[1]);
            }

            // 🟢 ENVIAR FORZANDO MULTIPART
            await api.put(`/capacitaciones/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            alert('¡Capacitación actualizada correctamente!');
            window.location.href = '/dashboard';

        } catch (error: unknown) {
            console.error(error);
            let msg = 'Error desconocido';

            if (error instanceof AxiosError) {
                msg = error.response?.data?.error || error.message;
            }

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

            {/* SECCIÓN 1: PANEL DE ESTADÍSTICAS */}
            <div className="animate-in fade-in space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div><p className="text-xs font-bold text-blue-500 uppercase">Hombres</p><h3 className="text-3xl font-bold text-blue-700">{watch('total_hombres')}</h3></div>
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600"><UserCheck size={24} /></div>
                    </div>
                    <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div><p className="text-xs font-bold text-pink-500 uppercase">Mujeres</p><h3 className="text-3xl font-bold text-pink-700">{watch('total_mujeres')}</h3></div>
                        <div className="bg-pink-100 p-3 rounded-full text-pink-600"><UserCheck size={24} /></div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div><p className="text-xs font-bold text-gray-500 uppercase">Total</p><h3 className="text-3xl font-bold text-gray-700">{watch('total_trabajadores')}</h3></div>
                        <div className="bg-gray-100 p-3 rounded-full text-gray-600"><Users size={24} /></div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="bg-linear-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 flex-1 shadow-sm">
                        <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-600 text-white rounded-lg"><PieChart size={20} /></div><h4 className="font-bold text-blue-900">Cobertura de la Sesión</h4></div>
                        <div className="flex items-end gap-2"><span className="text-4xl font-bold text-blue-700">{porcentajeGlobal}%</span><span className="text-sm text-blue-600 mb-1">del personal convocado</span></div>
                        <div className="w-full bg-white/50 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${porcentajeGlobal}%` }}></div></div>
                        <div className="mt-2 text-xs text-blue-800 flex justify-between font-medium"><span>Asistentes: {asistentesGlobal}</span><span>Convocados (Total): {totalGlobal}</span></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Detalle por Área Involucrada</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {statsPorArea.map((stat, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-100 p-3 rounded-lg hover:shadow-md transition">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-700 text-sm truncate w-1/2" title={stat.area}>{stat.area}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${stat.porcentaje === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{stat.asistentes} / {stat.total}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden"><div className={`h-2.5 rounded-full transition-all duration-1000 ${getColorBarra(stat.porcentaje)}`} style={{ width: `${stat.porcentaje}%` }}></div></div>
                                    <span className="text-xs font-bold w-8 text-right">{stat.porcentaje}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {statsPorArea.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No hay datos suficientes para generar estadísticas.</p>}
                </div>
            </div>

            {/* 🟢 TABS DE NAVEGACIÓN (MAIN TAB) */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setMainTab('detalle')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition ${mainTab === 'detalle' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    📝 Detalle y Asistencia
                </button>
                <button
                    onClick={() => setMainTab('evaluaciones')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition ${mainTab === 'evaluaciones' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    🧠 Evaluaciones
                </button>
            </div>

            {/* 🟢 RENDERIZADO CONDICIONAL DE LA PÁGINA */}
            {mainTab === 'evaluaciones' ? (
                <EvaluacionesTab
                    idCapacitacion={Number(id)}
                    evaluacionesExistentes={evaluaciones}
                    onRecargar={() => window.location.reload()}
                />
            ) : (

                /* --- FORMULARIO PRINCIPAL (DETALLE) --- */
                <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 mt-6">
                    <input type="hidden" {...register("area_objetivo")} />

                    {/* 2. DATOS GENERALES */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Building2 size={20} /><h3 className="font-bold">Datos Generales</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sede Principal</label>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 border p-3 rounded-lg w-full ${esAuditor ? 'opacity-70' : 'cursor-pointer'} ${watch('sede_empresa') === 'Majes' ? 'bg-blue-50 border-blue-500' : ''}`}><input type="radio" disabled={esAuditor} value="Majes" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">MAJES</span></label>
                                    <label className={`flex items-center gap-2 border p-3 rounded-lg w-full ${esAuditor ? 'opacity-70' : 'cursor-pointer'} ${watch('sede_empresa') === 'Olmos' ? 'bg-blue-50 border-blue-500' : ''}`}><input type="radio" disabled={esAuditor} value="Olmos" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">OLMOS</span></label>
                                </div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Código Acta</label><input disabled={esAuditor} {...register("codigo_acta", { required: true })} className={`w-full border rounded px-3 py-2 bg-gray-50 font-mono text-blue-900 ${errors.codigo_acta ? 'border-red-500' : ''}`} /></div>
                        </div>
                    </div>

                    {/* 3. DETALLES */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Clock size={20} /><h3 className="font-bold">Detalles de la Sesión</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8 relative" ref={autocompleteRef}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tema Principal</label>
                                <div className="relative">
                                    <input disabled={esAuditor} {...temaRegister} onChange={(e) => { temaRegister.onChange(e); handleTemaSearch(e.target.value); }} className="w-full border rounded pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar tema..." autoComplete="off" />
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                </div>
                                {mostrarSugerencias && sugerencias.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        <ul>
                                            {sugerencias.map((plan, index) => (
                                                <li key={index} onClick={() => seleccionarTema(plan)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-none transition-colors group">
                                                    <div className="text-sm font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{plan.tema}</div>
                                                    <div className="text-xs text-gray-400 mb-2">{plan.clasificacion}</div>
                                                    {plan.areas_objetivo && (
                                                        <div className="flex flex-wrap gap-1.5">{plan.areas_objetivo.split(',').map((area, i) => (<span key={i} className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">{area.trim()}</span>))}</div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-4"><label className="block text-sm font-medium text-gray-400 mb-1">Actividad Económica</label><div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500 text-sm">{empresaConfig?.actividad_economica}</div></div>
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
                                <div className="grid grid-cols-2 gap-2">{['Inducción', 'Capacitación', 'Entrenamiento', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (<label key={op} className="flex items-center gap-2"><input type="radio" disabled={esAuditor} value={op} {...register("actividad", { required: true })} /> {op}</label>))}</div>
                                {errors.actividad && <span className="text-red-500 text-xs">Requerido</span>}
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-2">Categoría</label>
                                <select disabled={esAuditor} {...register("categoria", { required: true })} className="w-full border rounded px-2 py-1.5"><option value="">-- Seleccionar --</option><option value="Seguridad">Seguridad</option><option value="Inocuidad">Inocuidad</option><option value="Cadena">Cadena Suministro</option><option value="Medio Ambiente">Medio Ambiente</option><option value="Responsabilidad Social">Resp. Social</option><option value="Gobernanza">Gobernanza</option><option value="Otros">Otros</option></select>
                                {errors.categoria && <span className="text-red-500 text-xs">Requerido</span>}
                            </div>
                            <div className="flex gap-8">
                                <div><label className="block font-bold mb-2">Modalidad</label><div className="flex gap-3"><label><input type="radio" disabled={esAuditor} value="Interna" {...register("modalidad", { required: true })} /> Interna</label><label><input type="radio" disabled={esAuditor} value="Externa" {...register("modalidad", { required: true })} /> Externa</label></div></div>
                                <div><label className="block font-bold mb-2">Acción Correctiva</label><div className="flex gap-3"><label><input type="radio" disabled={esAuditor} value="SI" {...register("accion_correctiva", { required: true })} /> SI</label><label><input type="radio" disabled={esAuditor} value="NO" {...register("accion_correctiva", { required: true })} /> NO</label></div></div>
                            </div>
                            <div>
                                <label className="block font-bold mb-2">Centros / Lugar</label>
                                <div className="flex flex-wrap gap-3">{['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Otros'].map(c => (<label key={c} className="flex gap-1"><input type="radio" disabled={esAuditor} value={c} {...register("centros", { required: true })} /> {c}</label>))}</div>
                                {errors.centros && <span className="text-red-500 text-xs">Requerido</span>}
                            </div>
                        </div>
                    </div>

                    {/* 5. EXPOSITOR Y FOTOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* COLUMNA EXPOSITOR */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4 flex gap-2">
                                <Briefcase size={18} /> Datos del Expositor
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Nombre</label>
                                        <input
                                            disabled={esAuditor}
                                            {...register("expositor_nombre")}
                                            placeholder="Nombre Completo"
                                            className="w-full border rounded px-3 py-2 text-sm bg-gray-50 disabled:opacity-75"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">DNI</label>
                                        <input
                                            disabled={esAuditor}
                                            {...register("expositor_dni")}
                                            placeholder="DNI"
                                            className="w-full border rounded px-3 py-2 text-sm bg-gray-50 disabled:opacity-75"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Institución de Procedencia</label>
                                    <input
                                        disabled={esAuditor}
                                        {...register("institucion_procedencia")}
                                        placeholder="Nombre de la institución"
                                        className="w-full border rounded px-3 py-2 text-sm bg-white font-medium text-blue-700"
                                    />
                                </div>

                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Firma Expositor</span>

                                    {/* 1. Si existe una firma (en el estado de react-hook-form) */}
                                    {watch('expositor_firma') ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="relative h-20 w-full bg-white border rounded p-1 shadow-sm">
                                                {/* Obtenemos la URL procesada */}
                                                {(() => {
                                                    const imageUrl = getImageUrl(watch('expositor_firma'));

                                                    // Si no hay URL, mostramos un estado vacío o cargando
                                                    if (!imageUrl) {
                                                        return (
                                                            <div className="flex items-center justify-center h-full text-gray-400 text-[10px] italic">
                                                                Sin firma registrada
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={imageUrl}
                                                            alt="Firma Expositor"
                                                            className="h-full w-full object-contain"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-green-600 font-medium text-sm">
                                                <CheckCircle2 size={16} /> Firmada con éxito
                                                {!esAuditor && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setValue('expositor_firma', '')}
                                                        className="p-1 hover:bg-red-50 rounded-full text-red-500 transition"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* 2. Si NO existe firma y NO es auditor, mostrar opciones para firmar */
                                        !esAuditor ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setModoFirma('subir')}
                                                        className={`text-xs border px-3 py-1 rounded transition ${modoFirma === 'subir' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}
                                                    >
                                                        <ImageIcon size={14} className="inline mr-1" /> Subir
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModoFirma('pantalla')}
                                                        className={`text-xs border px-3 py-1 rounded transition ${modoFirma === 'pantalla' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}
                                                    >
                                                        <PenTool size={14} className="inline mr-1" /> Firmar
                                                    </button>
                                                </div>

                                                {modoFirma === 'subir' && (
                                                    <div className="flex items-center gap-2 mt-2 p-2 border border-dashed rounded w-full bg-white">
                                                        <input type="file" accept="image/*" onChange={handleUploadFirmaExpositor} className="text-xs w-full" />
                                                        {uploadingExpositor && <Loader2 className="animate-spin text-blue-600" size={16} />}
                                                    </div>
                                                )}

                                                {modoFirma === 'pantalla' && (
                                                    <div className="mt-2 bg-white border border-dashed rounded-lg w-full overflow-hidden">
                                                        <SignaturePad ref={signaturePadRef} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* 3. Si es auditor y no hay firma */
                                            <span className="text-xs text-gray-400 italic">No se registró firma</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA EVIDENCIAS */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4 flex gap-2">
                                <Camera size={18} /> Evidencias de la Capacitación
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {!esAuditor && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center h-28 hover:bg-blue-50 hover:border-blue-300 cursor-pointer relative transition group">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <Camera className="text-gray-400 group-hover:text-blue-500 transition" size={24} />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-1 group-hover:text-blue-500">Añadir Fotos</span>
                                    </div>
                                )}

                                {/* Fotos cargadas de Cloudinary (Existentes) */}
                                {fotosExistentes.map(f => (
                                    <div key={f.id_documento} className="relative h-28 border rounded-lg overflow-hidden group shadow-sm">
                                        <a
                                            href={getImageUrl(f.url)} // 🟢 Asegura que el link también funcione
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 bg-white rounded-full text-gray-700 mx-1"
                                        >
                                            <Camera size={12} />
                                        </a>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <a href={getImageUrl(f.url)} target="_blank" className="p-1 bg-white rounded-full text-gray-700 mx-1">
                                                <Camera size={12} />
                                            </a>
                                            {!esAuditor && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeFotoExistente(f.id_documento)}
                                                    className="p-1 bg-red-500 rounded-full text-white mx-1 hover:scale-110 transition"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Previsualización de Fotos Nuevas (Antes de guardar) */}
                                {evidenciasNuevas.map((f, i) => (
                                    <div key={i} className="relative h-28 border-2 border-blue-200 rounded-lg overflow-hidden group shadow-sm">|
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={URL.createObjectURL(f)}
                                            alt="Nueva evidencia"
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute top-0 left-0 bg-blue-600 text-[8px] text-white px-1 font-bold">NUEVA</div>
                                        {!esAuditor && (
                                            <button
                                                type="button"
                                                onClick={() => removeEvidenciaNueva(i)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[10px] text-gray-400 italic">
                                * Se recomienda subir fotos nítidas del evento y la lista de asistencia firmada.
                            </p>
                        </div>
                    </div>

                    {/* 6. LISTA DE PERSONAS (ASISTENTES Y FALTANTES) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b pb-2 gap-4">
                            {/* 🟢 TABS INTERNOS (LISTA) */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                <button type="button" onClick={() => setListTab('asistentes')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${listTab === 'asistentes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><UserCheck size={16} /> Asistentes ({fields.length})</button>
                                <button type="button" onClick={() => setListTab('faltantes')} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${listTab === 'faltantes' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}><UserX size={16} /> Faltantes ({faltantes.length})</button>
                            </div>
                        </div>

                        {/* VISTA B: ASISTENTES (TABLA INTELIGENTE) */}
                        {listTab === 'asistentes' && (
                            <div className="animate-in fade-in">
                                {!esAuditor && (
                                    <div className="flex gap-2 mb-4">
                                        {watch('area_objetivo') && (
                                            <button type="button" onClick={cargarTrabajadoresDeArea} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm transition-all" title={`Cargar personal de: ${watch('area_objetivo')}`}><UserCheck size={16} /><span className="hidden sm:inline">Autocompletar ({watch('area_objetivo')})</span></button>
                                        )}
                                        {fields.length > 0 && (
                                            <button type="button" onClick={() => { if (confirm("¿Estás seguro de vaciar toda la lista?")) { replace([{ numero: 1, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' }]); } }} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-200 text-xs font-bold transition-all" title="Borrar toda la lista"><Trash2 size={16} /><span className="hidden sm:inline">Limpiar</span></button>
                                        )}
                                    </div>
                                )}
                                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2 uppercase px-2">
                                    <div className="col-span-1 text-center">#</div><div className="col-span-2">DNI</div><div className="col-span-4">Nombres</div><div className="col-span-2">Área</div><div className="col-span-2">Cargo</div><div className="col-span-1 text-center">Firma</div>
                                </div>
                                <div className="space-y-2">
                                    {fields.map((item, index) => {
                                        const { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles } = getOpcionesFila(index);
                                        return (
                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded border text-sm mb-2">
                                                <div className="col-span-1 font-bold text-center">{index + 1}</div>
                                                <div className="col-span-2"><Controller name={`participantes.${index}.dni`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={opcionesDNI} placeholder="DNI" onChange={(val: SelectOption | null) => { field.onChange(val?.value); if (val?.datos) autocompletarFila(index, val.datos); }} value={opcionesDNI.find(op => op.value === field.value)} styles={customStyles} noOptionsMessage={() => "No encontrado"} />} /></div>
                                                <div className="col-span-4"><Controller name={`participantes.${index}.apellidos_nombres`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={opcionesNombres} placeholder="Nombre" onChange={(val: SelectOption | null) => { field.onChange(val?.label); if (val?.datos) autocompletarFila(index, val.datos); }} value={opcionesNombres.find(op => op.label === field.value)} styles={customStyles} />} /></div>
                                                <div className="col-span-2"><Controller name={`participantes.${index}.area`} control={control} render={({ field }) => <Select {...field} isDisabled={esAuditor} options={areasDisponibles} placeholder="Área" onChange={(val: SelectOption | null) => { field.onChange(val?.label); setValue(`participantes.${index}.cargo`, ''); }} value={areasDisponibles.find(a => a.value === field.value)} styles={customStyles} />} /></div>
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
                        {listTab === 'faltantes' && (
                            <div className="animate-in fade-in">
                                {faltantes.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed"><CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" /><p className="font-bold">¡Excelente!</p><p className="text-sm">Todos asistieron.</p></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {faltantes.map((f) => (
                                            <div key={f.dni} className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-3">
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
            )}
        </div>
    );
}