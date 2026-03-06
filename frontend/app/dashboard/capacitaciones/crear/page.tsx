// frontend/app/dashboard/capacitaciones/crear/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler, SubmitErrorHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/services/api';
import { getEmpresaConfig } from '@/services/empresa.service';
import Select from 'react-select';
import { useTheme } from 'next-themes';
import {
    ArrowLeft, Save, UserPlus, Trash2, FileText, Clock, Briefcase,
    Building2, CheckCircle2, UploadCloud, Loader2, Image as ImageIcon,
    PenTool, Camera, X, Search, UserCheck, Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SignatureCanvas from 'react-signature-canvas';
import SignaturePad from '@/components/ui/SignaturePad';
import { uploadImageToLocal, uploadBase64 } from '@/services/upload.service';

// --- UTILIDADES ---
const normalizar = (texto: string | undefined | null) => {
    return (texto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

// --- INTERFACES ---
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
    expositor_firma?: string | FileList;
    evidencias?: FileList;
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

    // --- ESTADOS ---
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
    const params = useParams(); // 2. Usar el hook
    const id = params?.id; // 3. Obtener el ID

    useEffect(() => {
        if (!authLoading && user?.rol === 'Auditor') {
            router.push('/dashboard');
        }
    }, [user, authLoading, router]);

    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<Inputs>({
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

    const { fields, append, remove, replace } = useFieldArray({ control, name: "participantes" });
    const participantesWatch = watch('participantes');

    // --- CARGA INICIAL ---
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

    // --- CÁLCULO AUTOMÁTICO DE GÉNERO Y TOTALES ---
    useEffect(() => {
        if (!participantesWatch) return;

        let hombres = 0;
        let mujeres = 0;

        participantesWatch.forEach(p => {
            if (p.dni) {
                const generoRaw = String(p.genero || '').trim().toUpperCase();

                if (['M', 'MASCULINO', 'HOMBRE'].includes(generoRaw)) {
                    hombres++;
                } else if (['F', 'FEMENINO', 'MUJER'].includes(generoRaw)) {
                    mujeres++;
                }
            }
        });

        setValue('total_hombres', hombres);
        setValue('total_mujeres', mujeres);
        setValue('total_trabajadores', hombres + mujeres);
    }, [participantesWatch, setValue]);

    // --- AUTOCOMPLETE TEMA ---
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
        console.log("Datos del Plan:", plan);

        // 1. Asignar Tema y Actividad
        setValue('tema_principal', (plan.tema || '').trim());

        const tipoActividad = (plan.clasificacion || '').toLowerCase();
        let actividadFinal = 'Capacitación';
        if (tipoActividad.includes('inducci')) actividadFinal = 'Inducción';
        else if (tipoActividad.includes('taller')) actividadFinal = 'Taller';
        else if (tipoActividad.includes('charla')) actividadFinal = 'Charla';
        else if (tipoActividad.includes('simulacro')) actividadFinal = 'Simulacro';
        else if (tipoActividad.includes('entrenamiento')) actividadFinal = 'Entrenamiento';
        setValue('actividad', actividadFinal);

        // 3. 🟢 ASIGNAR CATEGORÍA (Lógica estricta)
        // Buscamos el dato en 'categoria' (BD) o 'eje' (si viniera del excel directo)
        const categoriaBD = (plan.categoria || plan.eje || '').trim();
        let categoriaFinal = 'Otros';

        // Mapeo exacto de lo que dice el Excel/BD a lo que dice el <select>
        // Normalizamos para ignorar mayúsculas/minúsculas y tildes
        const catNorm = normalizar(categoriaBD);

        if (catNorm.includes('social') || catNorm.includes('humanos')) {
            categoriaFinal = 'Responsabilidad Social';
        } else if (catNorm.includes('ambiente') || catNorm.includes('ambiental')) {
            categoriaFinal = 'Medio Ambiente';
        } else if (catNorm.includes('inocuidad') || catNorm.includes('alimentaria')) {
            categoriaFinal = 'Inocuidad';
        } else if (catNorm.includes('seguridad') || catNorm.includes('sst') || catNorm.includes('ssoma')) {
            categoriaFinal = 'Seguridad';
        } else if (catNorm.includes('cadena') || catNorm.includes('suministro')) {
            categoriaFinal = 'Cadena';
        } else if (catNorm.includes('gobernanza') || catNorm.includes('gobierno') || catNorm.includes('etica')) {
            categoriaFinal = 'Gobernanza';
        }

        console.log("Categoría asignada:", categoriaFinal);
        setValue('categoria', categoriaFinal);

        // 4. Asignar Áreas y Objetivo
        if (plan.areas_objetivo) setValue('area_objetivo', plan.areas_objetivo);
        else setValue('area_objetivo', '');

        if (plan.objetivo) setValue('objetivo', plan.objetivo);
        else setValue('objetivo', '');

        setValue('modalidad', 'Interna');
        setMostrarSugerencias(false);
    };

    const sedeSeleccionada = watch('sede_empresa');

    // --- MANEJO DE EVIDENCIAS Y FIRMAS ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // 1. Convertimos FileList a Array real
            const newFiles = Array.from(e.target.files);

            // 2. Unimos con lo que ya tenías (para no borrar las anteriores)
            const updatedFiles = [...evidencias, ...newFiles];

            // 3. Actualizamos la VISTA PREVIA
            setEvidencias(updatedFiles);

            // 4. 🟢 Actualizamos EL FORMULARIO (Esto es lo que faltaba)
            // Nota: React Hook Form acepta arrays de archivos si usamos setValue
            setValue("evidencias", updatedFiles as unknown as FileList, { shouldValidate: true });
        }
    };

    const removeEvidencia = (index: number) => {
        // 1. Filtramos para quitar la foto del índice seleccionado
        const updatedFiles = evidencias.filter((_, i) => i !== index);

        // 2. Actualizamos VISTA
        setEvidencias(updatedFiles);

        // 3. 🟢 Actualizamos FORMULARIO
        setValue("evidencias", updatedFiles as unknown as FileList, { shouldValidate: true });
    };

    // --- LOGICA TABLA INTELIGENTE (OPCIONES DINÁMICAS) ---
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

        // --- GENERACIÓN DINÁMICA ---
        const areasUnicas = Array.from(new Set(listaTrabajadores.map(t => t.area).filter(Boolean))).sort();
        const areasDisponibles = areasUnicas.map(a => ({ value: a, label: a }));

        const baseParaCargos = areaSeleccionada
            ? listaTrabajadores.filter(t => normalizar(t.area) === normalizar(areaSeleccionada))
            : listaTrabajadores;
        const cargosUnicos = Array.from(new Set(baseParaCargos.map(t => t.cargo).filter(Boolean))).sort();
        const cargosDisponibles = cargosUnicos.map(c => ({ value: c, label: c }));

        const opcionesNombres = trabajadoresFiltrados.map(t => ({
            value: String(t.dni).padStart(8, '0'), // 🟢 Forzamos 8 dígitos
            label: `${t.apellidos} ${t.nombres}`,
            datos: t
        }));
        const opcionesDNI = trabajadoresFiltrados.map(t => ({
            value: String(t.dni).padStart(8, '0'), // 🟢 Forzamos 8 dígitos
            label: String(t.dni).padStart(8, '0'),
            datos: t
        }));
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

    const handleUploadFirma = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingRow(index);
        try { const url = await uploadImageToLocal(file); if (url) setValue(`participantes.${index}.firma_url`, url); }
        finally { setUploadingRow(null); }
    };

    // --- MODAL FIRMA ---
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

    const uploadBase64ToFile = (base64Data: string, filename: string): File => {
        const arr = base64Data.split(",");
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: "image/png" });
    };

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        setLoading(true);
        try {
            const formData = new FormData();

            // 👇 LOG DE DIAGNÓSTICO 1
            console.log("🔍 DATA RECIBIDA DEL FORMULARIO:", data);
            console.log("🔍 MODO FIRMA:", modoFirma);

            // ---------------------------------------------------------
            // 1. FIRMA
            // ---------------------------------------------------------
            if (modoFirma === 'pantalla' && signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
                console.log("✅ Entró a firma por PANTALLA"); // <--- MIRA SI SALE ESTO
                const pad = signaturePadRef.current;
                const canvas = pad.getCanvas();
                const base64 = canvas.toDataURL('image/png');
                const archivoFirma = uploadBase64ToFile(base64, `firma_expositor_${Date.now()}.png`);
                formData.append('expositor_firma', archivoFirma);
            }

            else if (data.expositor_firma && (data.expositor_firma as unknown as FileList)[0] instanceof File) {
                console.log("✅ Entró a firma por INPUT FILE"); // <--- MIRA SI SALE ESTO
                const fileList = data.expositor_firma as unknown as FileList;
                formData.append('expositor_firma', fileList[0]);
            }

            else {
                console.log("⚠️ NO SE DETECTÓ FIRMA NUEVA (Ni pantalla ni archivo)");
                console.log("Tipo de dato firma:", typeof data.expositor_firma);
                console.log("Valor firma:", data.expositor_firma);
            }

            // ---------------------------------------------------------
            // 🟢 2. PROCESAR EVIDENCIAS (FOTOS)
            // ---------------------------------------------------------
            if (data.evidencias && data.evidencias.length > 0) {
                console.log(`📸 Procesando ${data.evidencias.length} evidencias...`);

                for (let i = 0; i < data.evidencias.length; i++) {
                    const file = data.evidencias[i];

                    // Verificamos en consola qué estamos a punto de enviar
                    console.log(`   - Archivo [${i}]:`, file.name, "Tipo:", file.type);

                    // 🟢 SIN VALIDACIONES ESTRICTAS: Simplemente lo agregamos
                    formData.append('evidencias', file);
                }
            } else {
                console.log("⚠️ data.evidencias está vacío o indefinido");
                // Intento de rescate: a veces el input file no se registra bien en 'data'
                // pero si tienes un ref, podrías buscarlo. Por ahora dejémoslo así.
            }

            // ---------------------------------------------------------
            // 🟢 3. CAMPOS DE TEXTO SIMPLES
            // ---------------------------------------------------------
            Object.keys(data).forEach((key) => {
                const k = key as keyof Inputs; // Casteo seguro
                if (k !== 'participantes' && k !== 'expositor_firma' && k !== 'evidencias') {
                    const value = data[k];
                    if (value !== undefined && value !== null) {
                        formData.append(key, String(value));
                    }
                }
            });

            // ---------------------------------------------------------
            // 🟢 4. PARTICIPANTES (JSON String)
            // ---------------------------------------------------------
            if (data.participantes) {
                formData.append('participantes', JSON.stringify(data.participantes));
            }

            // ---------------------------------------------------------
            // 🚀 5. ENVÍO A LA API
            // ---------------------------------------------------------
            let response;

            // 🟢 EL FIX DEFINITIVO: Configuración de cabeceras
            // Esto obliga al navegador a enviar los archivos correctamente
            const config = {
                headers: {
                    "Content-Type": undefined,
                },
            };

            // 🟢 CORRECCIÓN TS: 'id' ahora viene de useParams
            if (id) {
                console.log(`🔄 Actualizando capacitación ID: ${id}...`);
                // 👇 AQUI AGREGAMOS 'config' COMO TERCER ARGUMENTO
                response = await api.put(`/capacitaciones/${id}`, formData, config);
            } else {
                console.log("✨ Creando nueva capacitación...");
                // 👇 AQUI AGREGAMOS 'config' COMO TERCER ARGUMENTO
                response = await api.post('/capacitaciones', formData, config);
            }

            if (response.status === 200 || response.status === 201) {
                alert(id ? '¡Capacitación actualizada correctamente! 🔄' : '¡Capacitación registrada con éxito! 📄📸');
                router.push('/dashboard');
            }

        } catch (error: unknown) { // 🟢 CORRECCIÓN ESLINT: Usar unknown en lugar de any
            console.error("🔥 Error al procesar:", error);

            // Verificamos si error tiene la estructura de Axios sin usar 'any' explícito
            let mensajeError = "Error desconocido";
            if (error && typeof error === 'object' && 'response' in error) {
                // @ts-expect-error: Ignoramos error de tipo para acceder a data de forma rápida
                mensajeError = error.response?.data?.error || error.message;
            } else if (error instanceof Error) {
                mensajeError = error.message;
            }

            alert(`Error: ${mensajeError}`);
        } finally {
            setLoading(false);
        }
    };

    const onError: SubmitErrorHandler<Inputs> = (e) => {
        console.error("Errores:", e);
        alert("Faltan campos obligatorios. Revisa los bordes rojos.");
    };

    const temaRegister = register("tema_principal", { required: true });

    if (authLoading || user?.rol === 'Auditor') return null;

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
            alert("Primero selecciona un tema.");
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

            // 🛑 REGLA DE ORO: CUARENTENA DE OPERACIONES
            // Definimos qué palabras identifican al área de Operaciones
            const palabrasOperaciones = ["operaciones", "planta", "packing"];

            // ¿El trabajador pertenece REALMENTE a Operaciones?
            const esDeOperaciones = palabrasOperaciones.some(op => areaT.includes(op));

            // Iteramos sobre las áreas que el usuario pidió
            return areasBusqueda.some(aPlan => {

                // --- 1. FILTRO BLINDADO PARA OPERACIONES ---
                // Si el trabajador es de Operaciones, PERO el área que estamos evaluando en este momento del bucle
                // NO es "Operaciones" (ni sus sinónimos), entonces LO BLOQUEAMOS.
                // Esto evita que un "Asistente Logístico" de "Operaciones" entre cuando pedimos "Logística".
                if (esDeOperaciones) {
                    const pideOperaciones = palabrasOperaciones.some(op => aPlan.includes(op));
                    if (!pideOperaciones) {
                        return false; // ¡ADIÓS! No te queremos aquí si no te llamamos.
                    }
                }

                // --- 2. FILTROS ESPECÍFICOS (Agricola vs Riego) ---
                if (aPlan.includes("agricola")) {
                    const prohibidos = ["riego", "taller", "mecanico", "mecanizacion", "mantenimiento", "rrhh", "recursos humanos"];
                    if (prohibidos.some(p => areaT.includes(p))) return false;
                }
                if (aPlan.includes("riego")) {
                    const prohibidos = ["agricola", "campo", "taller"];
                    if (prohibidos.some(p => areaT.includes(p))) return false;
                }

                // --- 3. Lógica de Coincidencia (Si sobrevivió a los filtros) ---
                if (diccionario[aPlan]) {
                    return diccionario[aPlan].some(sinonimo =>
                        areaT.includes(sinonimo) || catT.includes(sinonimo) || cargoT.includes(sinonimo)
                    );
                }
                return areaT.includes(aPlan) || catT.includes(aPlan) || cargoT.includes(aPlan);
            });
        });

        if (sugeridos.length === 0) {
            alert(`No se encontraron trabajadores para: "${areaObjetivo}".`);
            return;
        }

        // --- LÓGICA DE LLENADO ---
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
        <div className="max-w-6xl mx-auto space-y-6 pb-20 relative">
            {/* MODAL FIRMA */}
            {indiceFirmaActiva !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700">
                        <div className="bg-gray-100 dark:bg-slate-900/50 px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><PenTool size={18} /> Firma Digital</h3>
                            <button onClick={cerrarModalFirma}><X size={24} className="text-gray-500 hover:text-red-500 transition-colors" /></button>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800">
                            <div className="border-2 border-dashed rounded-lg bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
                                <SignaturePad ref={workerPadRef} />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => workerPadRef.current?.clear()} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg text-sm transition-colors">Limpiar</button>
                            <button onClick={guardarFirmaModal} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">Aceptar</button>
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
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase">Rev:</span>
                    <input {...register("revision_usada")} className="w-12 bg-transparent border-b border-yellow-400 dark:border-yellow-600 text-sm font-bold text-center outline-none text-yellow-800 dark:text-yellow-200" />
                </div>
            </div>

            {/* PANEL DE CONTEO EN VIVO (VISUAL) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-in fade-in transition-all">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase">Hombres</p><h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{watch('total_hombres') || 0}</h3></div>
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full text-blue-600 dark:text-blue-400"><UserCheck size={20} /></div>
                </div>
                <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-900/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-pink-500 dark:text-pink-400 uppercase">Mujeres</p><h3 className="text-2xl font-bold text-pink-700 dark:text-pink-300">{watch('total_mujeres') || 0}</h3></div>
                    <div className="bg-pink-100 dark:bg-pink-900/40 p-2 rounded-full text-pink-600 dark:text-pink-400"><UserCheck size={20} /></div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</p><h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">{watch('total_trabajadores') || 0}</h3></div>
                    <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-full text-gray-600 dark:text-gray-400"><Users size={20} /></div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                <input type="hidden" {...register("area_objetivo")} />

                {/* 1. SEDE */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Building2 size={20} /> <h3 className="font-bold">Sede</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sede Principal</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full transition-all ${sedeSeleccionada === 'Majes' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                                    <input type="radio" value="Majes" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm text-gray-700 dark:text-gray-200">MAJES</span>
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full transition-all ${sedeSeleccionada === 'Olmos' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                                    <input type="radio" value="Olmos" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm text-gray-700 dark:text-gray-200">OLMOS</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código Acta <span className="text-red-500">*</span></label>
                            <input {...register("codigo_acta", { required: true })} className={`w-full border rounded px-3 py-2 bg-gray-50 dark:bg-slate-900/50 dark:text-gray-100 font-mono text-blue-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.codigo_acta ? 'border-red-500' : ''}`} placeholder="ACT-2025-XXX" />
                        </div>
                    </div>
                </div>

                {/* 2. DETALLES */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Clock size={20} /> <h3 className="font-bold">Detalles</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8 relative" ref={autocompleteRef}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema Principal <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input {...temaRegister} onChange={(e) => { temaRegister.onChange(e); handleTemaSearch(e.target.value); }} className="w-full border border-gray-200 dark:border-slate-700 rounded pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Buscar tema..." autoComplete="off" />
                                <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={18} />
                            </div>
                            {mostrarSugerencias && sugerencias.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    <ul>{sugerencias.map((plan, index) => (
                                        <li
                                            key={index}
                                            onClick={() => seleccionarTema(plan)}
                                            className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-none transition-colors group"
                                        >
                                            {/* 1. Título del Tema (Arriba) */}
                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                                {plan.tema}
                                            </div>

                                            {/* 2. Clasificación (Texto pequeño gris) */}
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                                {plan.clasificacion}
                                            </div>

                                            {/* 3. Etiquetas de Área (Abajo, separadas en 'chips') */}
                                            {plan.areas_objetivo && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {plan.areas_objetivo.split(',').map((area, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50"
                                                        >
                                                            {area.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    ))}</ul>
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-4"><label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actividad Económica</label><div className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-gray-100 dark:bg-slate-900/30 text-gray-500 dark:text-gray-400 text-xs font-medium">{empresaConfig?.actividad_economica}</div></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha *</label><input type="date" {...register("fecha", { required: true })} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label><input type="time" {...register("hora_inicio")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Término</label><input type="time" {...register("hora_termino")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Horas</label><input {...register("total_horas")} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-gray-50 dark:bg-slate-900/30 dark:text-gray-100 outline-none" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objetivo</label><textarea {...register("objetivo")} rows={2} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temario</label><textarea {...register("temario")} rows={3} className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    </div>
                </div>

                {/* 3. CLASIFICACIÓN */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><FileText size={20} /> <h3 className="font-bold">Clasificación</h3></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                        <div>
                            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">Actividad *</label>
                            <div className={`grid grid-cols-2 gap-2 p-2 rounded transition-colors ${errors.actividad ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-slate-900/30'}`}>
                                {['Inducción', 'Capacitación', 'Entrenamiento', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (
                                    <label key={op} className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"><input type="radio" value={op} {...register("actividad", { required: true })} className="accent-blue-600" /> {op}</label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">Categoría *</label>
                            <select {...register("categoria", { required: true })} className={`w-full border rounded px-2 py-1.5 bg-white dark:bg-slate-900/50 dark:text-gray-100 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.categoria ? 'border-red-500' : ''}`}>
                                <option value="">-- Seleccionar --</option>
                                <option value="Seguridad">Seguridad</option>
                                <option value="Inocuidad">Inocuidad</option>
                                <option value="Cadena">Cadena Suministro</option>
                                <option value="Medio Ambiente">Medio Ambiente</option>
                                <option value="Responsabilidad Social">Resp. Social</option>
                                <option value="Gobernanza">Gobernanza</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                        <div className="flex gap-8">
                            <div><label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">Modalidad *</label><div className="flex gap-3 text-gray-600 dark:text-gray-400"><label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-500"><input type="radio" value="Interna" {...register("modalidad", { required: true })} className="accent-blue-600" /> Interna</label><label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-500"><input type="radio" value="Externa" {...register("modalidad", { required: true })} className="accent-blue-600" /> Externa</label></div></div>
                            <div><label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">Acción Correctiva *</label><div className="flex gap-3 text-gray-600 dark:text-gray-400"><label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-500"><input type="radio" value="SI" {...register("accion_correctiva", { required: true })} className="accent-blue-600" /> SI</label><label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-500"><input type="radio" value="NO" {...register("accion_correctiva", { required: true })} className="accent-blue-600" /> NO</label></div></div>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">Centros / Lugar *</label>
                            <div className={`flex flex-wrap gap-3 p-2 rounded transition-colors ${errors.centros ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-slate-900/30'}`}>
                                {['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Otros'].map(c => (<label key={c} className="flex gap-1.5 items-center cursor-pointer text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"><input type="radio" value={c} {...register("centros", { required: true })} className="accent-blue-600" /> {c}</label>))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. EXPOSITOR */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Briefcase size={20} /> <h3 className="font-bold">Expositor</h3></div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input {...register("expositor_nombre")} placeholder="Nombre Completo" className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                        <input {...register("expositor_dni")} placeholder="DNI Expositor" className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900/50 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
                    </div>
                    <input {...register("institucion_procedencia")} placeholder="Institución" className="w-full border border-gray-200 dark:border-slate-700 rounded px-3 py-2 bg-gray-50 dark:bg-slate-900/30 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium mb-4" />
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-gray-50 dark:bg-slate-900/30">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Firma del Expositor:</label>
                        <div className="flex gap-2 mb-3">
                            <button type="button" onClick={() => setModoFirma('subir')} className={`text-xs px-3 py-1.5 border rounded flex items-center gap-2 transition-all ${modoFirma === 'subir' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}>
                                <ImageIcon size={14} /> Subir Imagen
                            </button>
                            <button type="button" onClick={() => setModoFirma('pantalla')} className={`text-xs px-3 py-1.5 border rounded flex items-center gap-2 transition-all ${modoFirma === 'pantalla' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}>
                                <PenTool size={14} /> Firmar Pantalla
                            </button>
                        </div>
                        {watch('expositor_firma') ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-500 bg-white dark:bg-slate-800 px-3 py-2 rounded border border-green-200 dark:border-green-900/30 animate-in zoom-in"><CheckCircle2 size={18} /> Firma Cargada <button type="button" onClick={() => setValue('expositor_firma', '')} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16} className="text-red-500" /></button></div>
                        ) : (
                            modoFirma === 'subir' ?
                                <label className="cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-800 p-2 border border-dashed border-gray-300 dark:border-slate-600 rounded justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group">
                                    {uploadingExpositor ? <Loader2 className="animate-spin text-blue-500" size={20} /> : <UploadCloud size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />} <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600">Subir firma</span> <input type="file" className="hidden" onChange={handleUploadFirmaExpositor} />
                                </label> : <div className="bg-white dark:bg-slate-100 rounded-lg p-1"><SignaturePad ref={signaturePadRef} /></div>
                        )}
                    </div>
                </div>

                {/* 5. TABLA INTELIGENTE (PARTICIPANTES) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-x-auto">
                    <div className="flex gap-2 mb-6">
                        {/* 🟢 BOTÓN AUTOCOMPLETAR */}
                        {watch('area_objetivo') && (
                            <button
                                type="button"
                                onClick={cargarTrabajadoresDeArea}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm transition-all"
                                title={`Cargar personal de: ${watch('area_objetivo')}`}
                            >
                                <UserCheck size={16} />
                                <span className="hidden sm:inline">Autocompletar ({watch('area_objetivo')})</span>
                            </button>
                        )}

                        {/* 🔴 BOTÓN LIMPIAR (Nuevo) */}
                        {fields.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm("¿Estás seguro de vaciar toda la lista?")) {
                                        replace([{ numero: 1, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' }]); // Reinicia a 1 fila vacía
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-200 text-xs font-bold transition-all"
                                title="Borrar toda la lista"
                            >
                                <Trash2 size={16} />
                                <span className="hidden sm:inline">Limpiar</span>
                            </button>
                        )}
                    </div>
                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 uppercase px-2">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-2">DNI</div>
                        <div className="col-span-4">Nombres</div>
                        <div className="col-span-2">Área</div>
                        <div className="col-span-2">Cargo</div>
                        <div className="col-span-1 text-center">Firma</div>
                    </div>
                    {fields.map((item, index) => {
                        const { opcionesNombres, opcionesDNI, cargosDisponibles, areasDisponibles } = getOpcionesFila(index);
                        return (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-slate-900/30 p-2 rounded border border-gray-100 dark:border-slate-800 text-sm mb-2 hover:bg-white dark:hover:bg-slate-900/50 transition-all">
                                <div className="col-span-1 font-bold text-center text-gray-400 dark:text-gray-600">{index + 1}</div>
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
                                            noOptionsMessage={() => "No encontrado"}
                                            styles={customStyles}
                                        />
                                    )} />
                                </div>
                                <div className="col-span-4">
                                    <Controller name={`participantes.${index}.apellidos_nombres`} control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            options={opcionesNombres}
                                            placeholder="Nombre..."
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
                                                field.onChange(val?.label);
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
                                            options={cargosDisponibles}
                                            placeholder="Cargo"
                                            isDisabled={!watch(`participantes.${index}.area`)}
                                            onChange={(val: SelectOption | null) => field.onChange(val?.value)}
                                            value={cargosDisponibles.find(op => op.value === field.value)}
                                            styles={customStyles}
                                        />
                                    )} />
                                </div>
                                <div className="col-span-1 flex justify-center gap-2">
                                    {watch(`participantes.${index}.firma_url`) ? <CheckCircle2 className="text-green-600 dark:text-green-500 animate-in zoom-in" size={20} /> : (
                                        <>
                                            <label className={`cursor-pointer p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors ${uploadingRow === index ? 'animate-spin' : ''}`} title="Subir foto de firma"><input type="file" className="hidden" onChange={(e) => handleUploadFirma(index, e)} /><UploadCloud size={18} className="text-blue-500" /></label>
                                            <button type="button" className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Firmar en pantalla" onClick={() => abrirModalFirma(index)}><PenTool size={18} className="text-purple-500" /></button>
                                        </>
                                    )}
                                    <button type="button" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar fila" onClick={() => remove(index)}><Trash2 size={18} className="text-red-500" /></button>
                                </div>
                            </div>
                        );
                    })}
                    <div className="mt-4 flex justify-center"><button type="button" onClick={() => append({ numero: 0, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' })} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 transition-all font-bold"><UserPlus size={18} /> Agregar Fila</button></div>
                </div>

                {/* 6. FOTOS */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-blue-700 dark:text-blue-400"><Camera size={20} /><h3 className="font-bold">Evidencias</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-blue-400 transition-all h-40 group">
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Camera className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors mb-2" size={32} /> <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600">Agregar Fotos</span>
                        </div>
                        {evidencias.map((f, i) => (
                            <div key={i} className="relative h-40 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm group animate-in zoom-in"><Image src={URL.createObjectURL(f)} alt="Preview" fill className="object-cover" unoptimized /> <button type="button" onClick={() => removeEvidencia(i)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button></div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
                    <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-bold">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} {loading ? 'Guardando...' : 'Guardar Acta'}
                    </button>
                </div>
            </form >
        </div >
    );
}