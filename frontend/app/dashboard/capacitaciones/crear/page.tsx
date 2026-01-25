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

    const customStyles = {
        control: (base: Record<string, unknown>) => ({ ...base, minHeight: '30px', fontSize: '12px' }),
        input: (base: Record<string, unknown>) => ({ ...base, margin: 0, padding: 0 }),
        menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 9999 })
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><PenTool size={18} /> Firma Digital</h3>
                            <button onClick={cerrarModalFirma}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
                        </div>
                        <div className="p-4 bg-white"><div className="border-2 border-dashed rounded-lg bg-gray-50"><SignaturePad ref={workerPadRef} /></div></div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => workerPadRef.current?.clear()} className="px-4 py-2 text-gray-600 rounded-lg text-sm">Limpiar</button>
                            <button onClick={guardarFirmaModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Aceptar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft className="text-gray-600" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Registrar Capacitación</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{empresaConfig?.codigo_formato}</span><span>•</span><span>RUC: {empresaConfig?.ruc}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-700 uppercase">Rev:</span>
                    <input {...register("revision_usada")} className="w-12 bg-transparent border-b border-yellow-400 text-sm font-bold text-center outline-none" />
                </div>
            </div>

            {/* PANEL DE CONTEO EN VIVO (VISUAL) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-in fade-in">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-blue-500 uppercase">Hombres</p><h3 className="text-2xl font-bold text-blue-700">{watch('total_hombres') || 0}</h3></div>
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><UserCheck size={20} /></div>
                </div>
                <div className="bg-pink-50 border border-pink-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-pink-500 uppercase">Mujeres</p><h3 className="text-2xl font-bold text-pink-700">{watch('total_mujeres') || 0}</h3></div>
                    <div className="bg-pink-100 p-2 rounded-full text-pink-600"><UserCheck size={20} /></div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div><p className="text-xs font-bold text-gray-500 uppercase">Total</p><h3 className="text-2xl font-bold text-gray-700">{watch('total_trabajadores') || 0}</h3></div>
                    <div className="bg-gray-100 p-2 rounded-full text-gray-600"><Users size={20} /></div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                <input type="hidden" {...register("area_objetivo")} />

                {/* 1. SEDE */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Building2 size={20} /> <h3 className="font-bold">Sede</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sede Principal</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full ${sedeSeleccionada === 'Majes' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                    <input type="radio" value="Majes" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">MAJES</span>
                                </label>
                                <label className={`flex items-center gap-2 cursor-pointer border p-3 rounded-lg w-full ${sedeSeleccionada === 'Olmos' ? 'bg-blue-50 border-blue-500' : ''}`}>
                                    <input type="radio" value="Olmos" {...register("sede_empresa")} className="accent-blue-600" /> <span className="font-bold text-sm">OLMOS</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código Acta <span className="text-red-500">*</span></label>
                            <input {...register("codigo_acta", { required: true })} className={`w-full border rounded px-3 py-2 bg-gray-50 font-mono text-blue-900 ${errors.codigo_acta ? 'border-red-500' : ''}`} placeholder="ACT-2025-XXX" />
                        </div>
                    </div>
                </div>

                {/* 2. DETALLES */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Clock size={20} /> <h3 className="font-bold">Detalles</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8 relative" ref={autocompleteRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tema Principal <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input {...temaRegister} onChange={(e) => { temaRegister.onChange(e); handleTemaSearch(e.target.value); }} className="w-full border rounded pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar tema..." autoComplete="off" />
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            </div>
                            {mostrarSugerencias && sugerencias.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    <ul>{sugerencias.map((plan, index) => (
                                        <li
                                            key={index}
                                            onClick={() => seleccionarTema(plan)}
                                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-none transition-colors group"
                                        >
                                            {/* 1. Título del Tema (Arriba) */}
                                            <div className="text-sm font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">
                                                {plan.tema}
                                            </div>

                                            {/* 2. Clasificación (Texto pequeño gris) */}
                                            <div className="text-xs text-gray-400 mb-2">
                                                {plan.clasificacion}
                                            </div>

                                            {/* 3. Etiquetas de Área (Abajo, separadas en 'chips') */}
                                            {plan.areas_objetivo && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {plan.areas_objetivo.split(',').map((area, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200"
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
                        <div className="md:col-span-4"><label className="block text-sm font-medium text-gray-400 mb-1">Actividad Económica</label><div className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500 text-sm">{empresaConfig?.actividad_economica}</div></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Fecha *</label><input type="date" {...register("fecha", { required: true })} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Inicio</label><input type="time" {...register("hora_inicio")} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Término</label><input type="time" {...register("hora_termino")} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-3"><label className="block text-sm font-medium mb-1">Total Horas</label><input {...register("total_horas")} className="w-full border rounded px-3 py-2 bg-gray-50" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium mb-1">Objetivo</label><textarea {...register("objetivo")} rows={2} className="w-full border rounded px-3 py-2" /></div>
                        <div className="md:col-span-12"><label className="block text-sm font-medium mb-1">Temario</label><textarea {...register("temario")} rows={3} className="w-full border rounded px-3 py-2" /></div>
                    </div>
                </div>

                {/* 3. CLASIFICACIÓN */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><FileText size={20} /> <h3 className="font-bold">Clasificación</h3></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">Actividad *</label>
                            <div className={`grid grid-cols-2 gap-2 p-2 rounded ${errors.actividad ? 'bg-red-50' : ''}`}>
                                {['Inducción', 'Capacitación', 'Entrenamiento', 'Taller', 'Charla', 'Simulacro', 'Otros'].map(op => (
                                    <label key={op} className="flex items-center gap-2 cursor-pointer"><input type="radio" value={op} {...register("actividad", { required: true })} className="accent-blue-600" /> {op}</label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">Categoría *</label>
                            <select {...register("categoria", { required: true })} className={`w-full border rounded px-2 py-1.5 ${errors.categoria ? 'border-red-500' : ''}`}>
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
                            <div><label className="block font-bold mb-2">Modalidad *</label><div className="flex gap-3"><label><input type="radio" value="Interna" {...register("modalidad", { required: true })} /> Interna</label><label><input type="radio" value="Externa" {...register("modalidad", { required: true })} /> Externa</label></div></div>
                            <div><label className="block font-bold mb-2">Acción Correctiva *</label><div className="flex gap-3"><label><input type="radio" value="SI" {...register("accion_correctiva", { required: true })} /> SI</label><label><input type="radio" value="NO" {...register("accion_correctiva", { required: true })} /> NO</label></div></div>
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-2">Centros / Lugar *</label>
                            <div className={`flex flex-wrap gap-3 p-2 rounded ${errors.centros ? 'bg-red-50' : ''}`}>
                                {['Planta Packing', 'Fundo', 'Campo', 'Auditorio', 'Otros'].map(c => (<label key={c} className="flex gap-1"><input type="radio" value={c} {...register("centros", { required: true })} /> {c}</label>))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. EXPOSITOR */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Briefcase size={20} /> <h3 className="font-bold">Expositor</h3></div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input {...register("expositor_nombre")} placeholder="Nombre Completo" className="w-full border rounded px-3 py-2" />
                        <input {...register("expositor_dni")} placeholder="DNI Expositor" className="w-full border rounded px-3 py-2" />
                    </div>
                    <input {...register("institucion_procedencia")} placeholder="Institución" className="w-full border rounded px-3 py-2 mb-4" />
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Firma del Expositor:</label>
                        <div className="flex gap-2 mb-3">
                            <button type="button" onClick={() => setModoFirma('subir')} className={`text-xs px-3 py-1.5 border rounded flex items-center gap-2 ${modoFirma === 'subir' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                <ImageIcon size={14} /> Subir Imagen
                            </button>
                            <button type="button" onClick={() => setModoFirma('pantalla')} className={`text-xs px-3 py-1.5 border rounded flex items-center gap-2 ${modoFirma === 'pantalla' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                                <PenTool size={14} /> Firmar Pantalla
                            </button>
                        </div>
                        {watch('expositor_firma') ? (
                            <div className="flex items-center gap-2 text-green-600 bg-white px-3 py-2 rounded border"><CheckCircle2 size={18} /> Firma Cargada <button type="button" onClick={() => setValue('expositor_firma', '')}><Trash2 size={16} className="text-red-500" /></button></div>
                        ) : (
                            modoFirma === 'subir' ?
                                <label className="cursor-pointer flex items-center gap-2 bg-white p-2 border border-dashed rounded justify-center">
                                    {uploadingExpositor ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />} <span className="text-sm">Subir firma</span> <input type="file" className="hidden" onChange={handleUploadFirmaExpositor} />
                                </label> : <SignaturePad ref={signaturePadRef} />
                        )}
                    </div>
                </div>

                {/* 5. TABLA INTELIGENTE (PARTICIPANTES) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2 uppercase px-2">
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
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded border text-sm mb-2">
                                <div className="col-span-1 font-bold text-center">{index + 1}</div>
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
                                <div className="col-span-1 flex justify-center gap-1">
                                    {watch(`participantes.${index}.firma_url`) ? <CheckCircle2 className="text-green-600" size={18} /> : (
                                        <>
                                            <label className={`cursor-pointer ${uploadingRow === index ? 'animate-spin' : ''}`}><input type="file" className="hidden" onChange={(e) => handleUploadFirma(index, e)} /><UploadCloud size={16} className="text-blue-500" /></label>
                                            <button type="button" onClick={() => abrirModalFirma(index)}><PenTool size={16} className="text-purple-500" /></button>
                                        </>
                                    )}
                                    <button type="button" onClick={() => remove(index)}><Trash2 size={16} className="text-red-500" /></button>
                                </div>
                            </div>
                        );
                    })}
                    <div className="mt-4 flex justify-center"><button type="button" onClick={() => append({ numero: 0, dni: '', apellidos_nombres: '', area: '', cargo: '', genero: 'M', condicion: '' })} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed text-blue-600 rounded-lg hover:bg-blue-50"><UserPlus size={18} /> Agregar Fila</button></div>
                </div>

                {/* 6. FOTOS */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2 text-blue-700"><Camera size={20} /><h3 className="font-bold">Evidencias</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 h-40">
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Camera className="text-blue-500 mb-2" size={24} /> <span className="text-sm">Agregar Fotos</span>
                        </div>
                        {evidencias.map((f, i) => (
                            <div key={i} className="relative h-40 border rounded-lg overflow-hidden"><Image src={URL.createObjectURL(f)} alt="Preview" fill className="object-cover" unoptimized /> <button type="button" onClick={() => removeEvidencia(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button></div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg text-gray-600">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
                        <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Acta'}
                    </button>
                </div>
            </form>
        </div>
    );
}