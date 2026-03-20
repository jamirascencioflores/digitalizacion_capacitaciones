// frontend/app/dashboard/capacitaciones/crear/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, SubmitHandler, SubmitErrorHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import Image from 'next/image';
import { getEmpresaConfig } from '@/services/empresa.service';
import { AxiosError } from 'axios';
import Select from 'react-select';
import { useTheme } from 'next-themes';
import {
    ArrowLeft, Save, UserPlus, Trash2, FileText, Clock, Briefcase,
    Building2, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon,
    PenTool, Camera, X, Search, UserCheck, Users, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import SignaturePad from '@/components/ui/SignaturePad';
import { uploadImageToLocal, uploadBase64 } from '@/services/upload.service';

// --- UTILIDADES ---
const normalizar = (texto: any) => {
    if (typeof texto !== 'string') return '';
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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
    eje?: string;
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
    expositor_firma?: string | FileList | File;
    evidencias?: FileList | File[];
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

export default function CrearCapacitacionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadingRow, setUploadingRow] = useState<number | null>(null);
    const { user, loading: authLoading } = useAuth();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: 'error' | 'exito', texto: string } | null>(null);

    const [planes, setPlanes] = useState<PlanItem[]>([]);
    const [sugerencias, setSugerencias] = useState<PlanItem[]>([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const [listaTrabajadores, setListaTrabajadores] = useState<TrabajadorSelect[]>([]);
    const [evidencias, setEvidencias] = useState<File[]>([]);
    const [uploadingExpositor, setUploadingExpositor] = useState(false);
    const [modoFirma, setModoFirma] = useState<'subir' | 'pantalla'>('subir');
    const signaturePadRef = useRef<SignatureCanvas>(null);
    const [indiceFirmaActiva, setIndiceFirmaActiva] = useState<number | null>(null);
    const workerPadRef = useRef<SignatureCanvas>(null);
    const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);

    useEffect(() => {
        if (!authLoading && user?.rol === 'auditor') {
            router.push('/dashboard');
        }
    }, [user, authLoading, router]);

    const { register, control, handleSubmit, setValue, watch, setError, setFocus, formState: { errors } } = useForm<Inputs>({
        defaultValues: {
            fecha: new Date().toISOString().split('T')[0],
            hora_inicio: "08:00",
            hora_termino: "09:00",
            total_horas: "1",
            revision_usada: "06",
            sede_empresa: "Majes",
            institucion_procedencia: "AGRICOLA PAMPA BAJA S.A.C.",
            participantes: [{ numero: 1, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' }]
        }
    });

    const { fields, append, remove, replace, update } = useFieldArray({ control, name: "participantes" });
    const participantesWatch = watch('participantes');

    useEffect(() => {
        const cargarDatos = async () => {
            const config = await getEmpresaConfig();
            if (config) {
                setEmpresaConfig(config);
                setValue('revision_usada', config.revision_actual);
                setValue('institucion_procedencia', config.nombre);
            }
            try {
                const { data: dataPlanes } = await api.get('/gestion/temas');
                setPlanes(dataPlanes);
                const { data: dataTrab } = await api.get('/trabajadores/listado');
                setListaTrabajadores(dataTrab);
            } catch (error) {
                console.error("Error cargando datos:", error);
            }
        };
        cargarDatos();

        function handleClickOutside(event: MouseEvent) {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setMostrarSugerencias(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setValue]);

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
        setValue('tema_principal', (plan.tema || '').trim(), { shouldValidate: true });

        const tipoActividad = (plan.clasificacion || '').toLowerCase();
        let actividadFinal = 'Capacitación';
        if (tipoActividad.includes('inducci')) actividadFinal = 'Inducción';
        else if (tipoActividad.includes('taller')) actividadFinal = 'Taller';
        else if (tipoActividad.includes('charla')) actividadFinal = 'Charla';
        else if (tipoActividad.includes('simulacro')) actividadFinal = 'Simulacro';
        else if (tipoActividad.includes('entrenamiento')) actividadFinal = 'Entrenamiento';
        setValue('actividad', actividadFinal, { shouldValidate: true });

        const categoriaBD = (plan.categoria || plan.eje || '').trim();
        let categoriaFinal = 'Otros';
        const catNorm = normalizar(categoriaBD);

        if (catNorm.includes('social') || catNorm.includes('humanos')) categoriaFinal = 'Responsabilidad Social';
        else if (catNorm.includes('ambiente') || catNorm.includes('ambiental')) categoriaFinal = 'Medio Ambiente';
        else if (catNorm.includes('inocuidad') || catNorm.includes('alimentaria')) categoriaFinal = 'Inocuidad';
        else if (catNorm.includes('seguridad') || catNorm.includes('sst') || catNorm.includes('ssoma')) categoriaFinal = 'Seguridad';
        else if (catNorm.includes('cadena') || catNorm.includes('suministro')) categoriaFinal = 'Cadena';
        else if (catNorm.includes('gobernanza') || catNorm.includes('gobierno') || catNorm.includes('etica')) categoriaFinal = 'Gobernanza';

        setValue('categoria', categoriaFinal, { shouldValidate: true });
        setValue('area_objetivo', plan.areas_objetivo || '');
        setValue('objetivo', plan.objetivo || '');
        setValue('modalidad', 'Interna', { shouldValidate: true });
        setMostrarSugerencias(false);
    };

    const sedeSeleccionada = watch('sede_empresa');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const webpFiles = await Promise.all(files.map(file => convertirAWebp(file)));
            const updatedFiles = [...evidencias, ...webpFiles];
            setEvidencias(updatedFiles);
            setValue("evidencias", updatedFiles, { shouldValidate: true });
        }
    };

    const removeEvidencia = (index: number) => {
        const updatedFiles = evidencias.filter((_, i) => i !== index);
        setEvidencias(updatedFiles);
        setValue("evidencias", updatedFiles, { shouldValidate: true });
    };

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
        const yaExiste = participantesWatch.some((p, i) => i !== index && p.dni === trabajador.dni);

        if (yaExiste) {
            setMensajeAlerta({ tipo: 'error', texto: `El trabajador ${trabajador.apellidos} ${trabajador.nombres} ya está en la lista.` });
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
            firma_url: trabajador.firma_url || participantesWatch[index]?.firma_url || '',
            es_maestra: !!trabajador.firma_url
        });
    };

    const handleUploadFirma = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingRow(index);
        try {
            const webpFile = await convertirAWebp(file);
            const url = await uploadImageToLocal(webpFile);
            if (url) setValue(`participantes.${index}.firma_url`, url);
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
                setMensajeAlerta({ tipo: 'error', texto: "Error al subir firma del expositor" });
            } finally {
                setUploadingExpositor(false);
            }
        }
    };

    const generarCodigoActa = () => {
        const sede = watch('sede_empresa') === 'Majes' ? 'M' : 'O';
        const fecha = new Date();
        const yy = String(fecha.getFullYear()).slice(-2);
        const mm = String(fecha.getMonth() + 1).padStart(2, '0');
        const nombreUsr = user?.nombre || 'US';
        const iniciales = nombreUsr.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const aleatorio = Math.floor(100 + Math.random() * 900);
        const nuevoCodigo = `ACT-${sede}-${yy}${mm}-${iniciales}-${aleatorio}`;
        setValue('codigo_acta', nuevoCodigo, { shouldValidate: true });
    };

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        setLoading(true);
        setMensajeAlerta(null);
        try {
            const formData = new FormData();

            // 1. FIRMA EXPOSITOR
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

            // 2. EVIDENCIAS
            if (data.evidencias && data.evidencias.length > 0) {
                for (let i = 0; i < data.evidencias.length; i++) {
                    formData.append('evidencias', (data.evidencias as File[])[i]);
                }
            }

            // 3. TEXTOS SIMPLES
            (Object.keys(data) as Array<keyof Inputs | string>).forEach((key) => {
                if (key !== 'participantes' && key !== 'expositor_firma' && key !== 'evidencias') {
                    const val = data[key as keyof Inputs];
                    if (val !== undefined && val !== null) {
                        formData.append(key, String(val));
                    }
                }
            });

            // 4. PARTICIPANTES
            if (data.participantes) {
                formData.append('participantes', JSON.stringify(data.participantes));
            }

            const config = { headers: { "Content-Type": undefined } };
            const response = await api.post('/capacitaciones', formData, config);

            if (response.status === 200 || response.status === 201) {
                setMensajeAlerta({ tipo: 'exito', texto: '¡Capacitación registrada con éxito! 📄' });
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                setTimeout(() => router.push('/dashboard'), 2000);
                return;
            }

        } catch (error: unknown) {
            console.error("🔥 Error completo:", error);
            let msg = 'Error desconocido al registrar';

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
            setLoading(false);
        }
    };

    const onError: SubmitErrorHandler<Inputs> = (e) => {
        console.error("Errores:", e);
        setMensajeAlerta({ tipo: 'error', texto: "Faltan campos obligatorios. Revisa los recuadros resaltados en rojo." });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const temaRegister = register("tema_principal", { required: true });

    if (authLoading || user?.rol === 'auditor') return null;

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

    const cargarTrabajadoresDeArea = () => {
        const areaObjetivo = watch('area_objetivo');
        if (!areaObjetivo) {
            setMensajeAlerta({ tipo: 'error', texto: "Primero selecciona un tema." });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const areasBusqueda = areaObjetivo.split(',').map(a => normalizar(a.trim()));

        const diccionario: Record<string, string[]> = {
            "rrhh": ["recursos humanos", "personal", "rrhh", "social", "bienestar"],
            "sig": ["sig", "sistema de gestion", "integrado", "calidad", "sso"],
            "logistica": ["logistica", "almacen", "compras", "adquisiciones", "suministros"],
            "planificacion": ["planificacion", "planeamiento", "control", "proyectos"],
            "mantenimiento": ["mecanizacion", "taller", "mantenimiento", "maquinaria"],
            "mecanizacion": ["mecanizacion", "taller", "mantenimiento"],
            "cifhs": ["cifhs", "hostigamiento", "comite", "genero", "violencia"],
            "eds": ["eds", "desempeño social"],
            "scsst": ["scsst", "comite", "seguridad y salud", "csst"],
            "agricola": ["agricola", "campo", "cosecha", "cultivo", "fitosanidad"],
            "sanidad": ["sanidad", "evaluadores", "plagas"],
            "riego": ["riego"],
            "operaciones": ["operaciones", "planta", "packing"]
        };

        const sugeridos = listaTrabajadores.filter(t => {
            const areaT = normalizar(t.area);
            const catT = normalizar(t.categoria || "");
            const cargoT = normalizar(t.cargo || "");

            const palabrasOperaciones = ["operaciones", "planta", "packing"];
            const esDeOperaciones = palabrasOperaciones.some(op => areaT.includes(op));

            return areasBusqueda.some(aPlan => {
                if (esDeOperaciones) {
                    const pideOperaciones = palabrasOperaciones.some(op => aPlan.includes(op));
                    if (!pideOperaciones) return false;
                }
                if (aPlan.includes("agricola")) {
                    const prohibidos = ["riego", "taller", "mecanico", "mecanizacion", "mantenimiento", "rrhh", "recursos humanos"];
                    if (prohibidos.some(p => areaT.includes(p))) return false;
                }
                if (aPlan.includes("riego")) {
                    const prohibidos = ["agricola", "campo", "taller"];
                    if (prohibidos.some(p => areaT.includes(p))) return false;
                }
                if (diccionario[aPlan]) {
                    return diccionario[aPlan].some(sinonimo =>
                        areaT.includes(sinonimo) || catT.includes(sinonimo) || cargoT.includes(sinonimo)
                    );
                }
                return areaT.includes(aPlan) || catT.includes(aPlan) || cargoT.includes(aPlan);
            });
        });

        if (sugeridos.length === 0) {
            setMensajeAlerta({ tipo: 'error', texto: `No se encontraron trabajadores para el área: "${areaObjetivo}".` });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const hayDatosPrevios = fields.length > 0 && (fields.length > 1 || participantesWatch[0].dni !== "");
        let debeReemplazar = false;

        if (hayDatosPrevios) {
            if (confirm(`Se encontraron ${sugeridos.length} personas.\n\n[ACEPTAR] = Reemplazar.\n[CANCELAR] = Agregar.`)) debeReemplazar = true;
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

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 relative px-4">

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

            {indiceFirmaActiva !== null && (
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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition"><ArrowLeft className="text-gray-600 dark:text-gray-400" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Capacitación</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{empresaConfig?.codigo_formato}</span><span>•</span><span>RUC: {empresaConfig?.ruc}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg px-3 py-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-widest">Rev:</span>
                    <input {...register("revision_usada")} className="w-12 bg-transparent border-b border-yellow-400 dark:border-yellow-600 text-sm font-bold text-center outline-none text-yellow-800 dark:text-yellow-200" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-blue-500/30 group">
                    <div>
                        <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">Hombres</p>
                        <h3 className="text-3xl font-black text-blue-700 dark:text-blue-300 tabular-nums">{watch('total_hombres') || 0}</h3>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><UserCheck size={28} /></div>
                </div>
                <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-pink-100 dark:border-pink-900/20 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-pink-500/30 group">
                    <div>
                        <p className="text-[10px] font-bold text-pink-500 dark:text-pink-400 uppercase tracking-widest mb-1">Mujeres</p>
                        <h3 className="text-3xl font-black text-pink-700 dark:text-pink-300 tabular-nums">{watch('total_mujeres') || 0}</h3>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-900/30 p-3 rounded-2xl text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform"><UserCheck size={28} /></div>
                </div>
                <div className="bg-white dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-slate-500/30 group">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Asistentes</p>
                        <h3 className="text-3xl font-black text-slate-700 dark:text-slate-200 tabular-nums">{watch('total_trabajadores') || 0}</h3>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform"><Users size={28} /></div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                <input type="hidden" {...register("area_objetivo")} />

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                        <Building2 size={20} /> <h3 className="uppercase tracking-widest text-sm">Información de Sede</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-3 tracking-widest">Sede de Ejecución</label>
                            <div className="flex gap-4">
                                <label className={`flex flex-1 items-center gap-3 cursor-pointer border-2 p-4 rounded-2xl transition-all ${sedeSeleccionada === 'Majes' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-4 ring-blue-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                    <input type="radio" value="Majes" {...register("sede_empresa")} className="accent-blue-600 w-4 h-4" />
                                    <span className="font-bold text-gray-700 dark:text-gray-200">PEDREGAL - MAJES</span>
                                </label>
                                <label className={`flex flex-1 items-center gap-3 cursor-pointer border-2 p-4 rounded-2xl transition-all ${sedeSeleccionada === 'Olmos' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-4 ring-blue-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                    <input type="radio" value="Olmos" {...register("sede_empresa")} className="accent-blue-600 w-4 h-4" />
                                    <span className="font-bold text-gray-700 dark:text-gray-200">TIERRAS NUEVAS - OLMOS</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.codigo_acta ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Código de Acta Oficial</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-600"><FileText size={18} /></div>
                                    <input
                                        {...register("codigo_acta", { required: "El código es obligatorio" })}
                                        className={`w-full border-2 rounded-2xl pl-10 pr-3 py-3 font-mono font-bold outline-none transition-all ${errors.codigo_acta ? 'border-red-500 bg-red-50 dark:bg-red-950/20 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent focus:border-blue-500 dark:text-blue-100'}`}
                                        placeholder="ACT-YYYY-XXX"
                                    />
                                </div>
                                <button type="button" onClick={generarCodigoActa} className="px-5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-black dark:hover:bg-slate-600 transition-all shadow-lg active:scale-95 text-sm">Auto-Generar</button>
                            </div>
                            {errors.codigo_acta && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase animate-pulse">{errors.codigo_acta.message}</span>}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Clock size={20} /> <h3 className="font-bold">Detalles</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8 relative" ref={autocompleteRef}>
                            <label className={`block text-sm font-medium mb-1 ${errors.tema_principal ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                Tema Principal <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    {...temaRegister}
                                    onChange={(e) => { temaRegister.onChange(e); handleTemaSearch(e.target.value); }}
                                    className={`w-full border rounded pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-gray-100 outline-none transition-all ${errors.tema_principal
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-200 dark:ring-red-900/50 text-red-900 dark:text-red-200'
                                        : 'border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
                                        }`}
                                    placeholder="Buscar tema..."
                                    autoComplete="off"
                                />
                                <Search className={`absolute left-3 top-2.5 ${errors.tema_principal ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                            </div>
                            {errors.tema_principal && <span className="text-red-500 text-xs mt-1 block">Debes seleccionar o escribir un tema</span>}
                            {mostrarSugerencias && sugerencias.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    <ul>{sugerencias.map((plan, index) => (
                                        <li
                                            key={index}
                                            onClick={() => seleccionarTema(plan)}
                                            className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-none transition-colors group"
                                        >
                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                                {plan.tema}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {plan.areas_objetivo && plan.areas_objetivo.split(',').map((areaStr: string, i: number) => (
                                                    <span key={i} className="text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                                        {areaStr.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </li>
                                    ))}</ul>
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actividad Económica</label>
                            <div className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-gray-100 dark:bg-slate-900/30 text-gray-500 dark:text-gray-400 text-xs font-medium">
                                {empresaConfig?.actividad_economica}
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className={`block text-sm font-medium mb-1 ${errors.fecha ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                Fecha <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                {...register("fecha", { required: true })}
                                className={`w-full border rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.fecha ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`}
                            />
                            {errors.fecha && <span className="text-red-500 text-xs mt-1 block">Obligatorio</span>}
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label>
                            <input type="time" {...register("hora_inicio")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Término</label>
                            <input type="time" {...register("hora_termino")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Horas</label>
                            <input {...register("total_horas")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-gray-50 dark:bg-slate-900/30 dark:text-gray-100 outline-none" />
                        </div>
                        <div className="md:col-span-12">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo</label>
                            <textarea {...register("objetivo")} rows={2} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="md:col-span-12">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temario</label>
                            <textarea {...register("temario")} rows={3} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                        <FileText size={20} /> <h3 className="uppercase tracking-widest text-sm">Clasificación de Actividad</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.actividad ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Tipo de Actividad</label>
                            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 rounded-2xl border-2 transition-all ${errors.actividad ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                {['Inducción', 'Capacitación', 'Entrenamiento', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (
                                    <label key={op} className="flex items-center gap-2 cursor-pointer group">
                                        <input type="radio" value={op} {...register("actividad", { required: true })} className="accent-blue-600 w-4 h-4" />
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{op}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.actividad && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase">Selección requerida</span>}
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.categoria ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Categoría del Evento</label>
                                <select
                                    {...register("categoria", { required: true })}
                                    className={`w-full border-2 rounded-2xl px-4 py-3 font-bold outline-none transition-all ${errors.categoria ? 'border-red-500 bg-red-50 dark:bg-red-950/20 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent focus:border-blue-500 dark:text-white'}`}
                                >
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
                                {/* 🔴 CAMPO MODALIDAD CON ALERTA VISUAL */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.modalidad ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>
                                        Modalidad <span className="text-red-500">*</span>
                                    </label>
                                    <div className={`flex p-1 rounded-xl border-2 transition-all ${errors.modalidad ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                        <label className="flex-1 text-center py-2 rounded-lg cursor-pointer font-bold text-sm transition-all has-checked:bg-blue-600 has-checked:text-white text-gray-500">
                                            <input type="radio" value="Interna" {...register("modalidad", { required: true })} className="sr-only" /> Interna
                                        </label>
                                        <label className="flex-1 text-center py-2 rounded-lg cursor-pointer font-bold text-sm transition-all has-checked:bg-blue-600 has-checked:text-white text-gray-500">
                                            <input type="radio" value="Externa" {...register("modalidad", { required: true })} className="sr-only" /> Externa
                                        </label>
                                    </div>
                                    {errors.modalidad && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase">Selección requerida</span>}
                                </div>

                                {/* 🔴 CAMPO A. CORRECTIVA CON ALERTA VISUAL */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.accion_correctiva ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>
                                        A. Correctiva <span className="text-red-500">*</span>
                                    </label>
                                    <div className={`flex p-1 rounded-xl border-2 transition-all ${errors.accion_correctiva ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                        <label className="flex-1 text-center py-2 rounded-lg cursor-pointer font-bold text-sm transition-all has-checked:bg-red-500 has-checked:text-white text-gray-500">
                                            <input type="radio" value="SI" {...register("accion_correctiva", { required: true })} className="sr-only" /> SI
                                        </label>
                                        <label className="flex-1 text-center py-2 rounded-lg cursor-pointer font-bold text-sm transition-all has-checked:bg-green-600 has-checked:text-white text-gray-500">
                                            <input type="radio" value="NO" {...register("accion_correctiva", { required: true })} className="sr-only" /> NO
                                        </label>
                                    </div>
                                    {errors.accion_correctiva && <span className="text-red-500 text-[10px] font-black mt-2 block uppercase">Selección requerida</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <label className={`block text-[11px] font-bold uppercase mb-3 tracking-widest ${errors.centros ? 'text-red-600' : 'text-gray-400 dark:text-slate-500'}`}>Lugar / Centro de Capacitación</label>
                        <div className={`flex flex-wrap gap-2 p-4 rounded-2xl border-2 transition-all ${errors.centros ? 'bg-red-50 dark:bg-red-950/20 border-red-500 ring-4 ring-red-500/10' : 'bg-gray-50 dark:bg-slate-900/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                            {['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Comedor', 'Sala de Reuniones', 'E-Learning', 'Otros'].map(c => (
                                <label key={c} className={`px-4 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${watch('centros') === c ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500 hover:border-blue-500/50'}`}>
                                    <input type="radio" value={c} {...register("centros", { required: true })} className="sr-only" /> {c}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                        <Briefcase size={20} /> <h3 className="uppercase tracking-widest text-sm">Información del Expositor</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Nombre Completo</label>
                            <input {...register("expositor_nombre")} placeholder="Ej: Juan Perez" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Documento DNI</label>
                            <input {...register("expositor_dni")} placeholder="8 dígitos" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium" />
                        </div>
                    </div>
                    <div className="space-y-1 mb-6">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Empresa / Institución</label>
                        <input {...register("institucion_procedencia")} placeholder="Nombre de la empresa" className="w-full border-2 border-transparent bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 dark:text-white outline-none focus:border-blue-500 transition-all font-medium" />
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">Firma del Expositor</label>
                            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border dark:border-slate-700">
                                <button type="button" onClick={() => setModoFirma('subir')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${modoFirma === 'subir' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                    <ImageIcon size={14} /> SUBIR IMAGEN
                                </button>
                                <button type="button" onClick={() => setModoFirma('pantalla')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${modoFirma === 'pantalla' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                    <PenTool size={14} /> DIBUJAR FIRMA
                                </button>
                            </div>
                        </div>

                        <div className="min-h-[140px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30 overflow-hidden">
                            {watch('expositor_firma') ? (
                                <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-full shadow-inner"><CheckCircle2 size={32} /></div>
                                    <span className="text-xs font-black text-green-600 dark:text-green-500 uppercase tracking-widest">Firma Registrada</span>
                                    <button type="button" onClick={() => setValue('expositor_firma', '')} className="text-[10px] font-bold text-red-500 hover:underline uppercase mt-2">Eliminar y volver a firmar</button>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700" >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-50 dark:border-slate-700 pb-4">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
                            <Users size={20} /> <h3 className="uppercase tracking-widest text-sm">Listado de Asistencia</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {watch('area_objetivo') && (
                                <button type="button" onClick={cargarTrabajadoresDeArea} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-xs font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95">
                                    <UserCheck size={16} /> AUTOCOMPLETAR ({watch('area_objetivo')})
                                </button>
                            )}
                            <button type="button" onClick={() => replace([{ numero: 1, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' }])} className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-100 transition-all text-xs font-bold">
                                <Trash2 size={16} /> LIMPIAR LISTA
                            </button>
                        </div>
                    </div>

                    {/* 🟢 AQUÍ TAMBIÉN ESTÁ EL CAMBIO CLAVE DE DISEÑO: Quitamos el div 'overflow-x-auto' que cortaba las listas */}
                    {/* EL GRID SIN OVERFLOW PARA QUE NO SE CORTE EL MENÚ */}
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
                                    <div className="col-span-3">
                                        <Controller name={`participantes.${index}.apellidos_nombres`} control={control} render={({ field }) => (
                                            <Select
                                                {...field}
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
                                                isDisabled={!watch(`participantes.${index}.area`)}
                                                options={cargosDisponibles}
                                                placeholder="Cargo"
                                                onChange={(val: SelectOption | null) => field.onChange(val?.value)}
                                                value={cargosDisponibles.find(op => op.value === field.value)}
                                                styles={customStyles}
                                            />
                                        )} />
                                    </div>

                                    {/* 🟢 ZONA DE FIRMAS (Ajustada para Crear, sin validaciones de Auditor) */}
                                    <div className="col-span-2 flex justify-center items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        {watch(`participantes.${index}.firma_url`) ? (
                                            <div className="flex items-center gap-1">
                                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg" title="Firma Registrada">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                {/* 🟢 Solo permite borrar si la firma NO es maestra (se hizo en el momento) */}
                                                {!(participantesWatch[index] as any).es_maestra && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setValue(`participantes.${index}.firma_url`, '', { shouldValidate: true, shouldDirty: true })}
                                                        className="p-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-500 hover:text-orange-600 rounded-lg transition-colors"
                                                        title="Borrar y volver a firmar"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <label className={`cursor-pointer p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:text-blue-600 transition-colors ${uploadingRow === index ? 'opacity-50 pointer-events-none' : ''}`} title="Subir firma">
                                                    <input type="file" className="hidden" disabled={uploadingRow === index} onChange={(e) => handleUploadFirma(index, e)} />
                                                    {uploadingRow === index ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <UploadCloud size={16} />}
                                                </label>
                                                <button type="button" onClick={() => abrirModalFirma(index)} className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:text-purple-600 transition-colors" title="Dibujar firma">
                                                    <PenTool size={16} />
                                                </button>
                                            </>
                                        )}

                                        {/* SEPARADOR Y BOTÓN DE BORRAR FILA */}
                                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                                        <button type="button" onClick={() => remove(index)} className="p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors" title="Eliminar trabajador">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button type="button" onClick={() => append({ numero: 0, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' })} className="mt-4 w-full py-4 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-gray-400 dark:text-slate-600 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-bold uppercase text-[10px] tracking-[0.2em]">
                        <UserPlus size={18} /> AGREGAR NUEVO PARTICIPANTE
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-6 text-blue-700 dark:text-blue-400 font-bold border-b border-gray-50 dark:border-slate-700 pb-3">
                        <Camera size={20} /> <h3 className="uppercase tracking-widest text-sm">Evidencias Fotográficas</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <label className="aspect-square relative border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50 hover:border-blue-500 transition-all group">
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-500 p-3 rounded-xl group-hover:scale-110 transition-transform mb-2"><Camera size={24} /></div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Añadir Fotos</span>
                        </label>
                        {evidencias.map((f, i) => (
                            <div key={i} className="aspect-square relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group animate-in zoom-in-95 duration-300 shadow-sm">
                                <Image src={URL.createObjectURL(f)} alt="Evidencia" fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button type="button" onClick={() => removeEvidencia(i)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN FINAL */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4 border-t border-gray-100 dark:border-slate-800">
                    <button type="button" onClick={() => router.back()} className="px-8 py-3.5 border-2 border-gray-100 dark:border-slate-800 rounded-2xl text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all font-bold uppercase tracking-widest text-xs">CANCELAR</button>
                    <button type="submit" disabled={loading} className="px-12 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group tracking-widest text-xs uppercase">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
                        {loading ? 'Guardando Registro...' : 'REGISTRAR ACTA'}
                    </button>
                </div>
            </form>
        </div>
    );
}