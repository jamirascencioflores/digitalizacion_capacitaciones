// frontend/app/evaluacion/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import api from '@/services/api';
import { CheckCircle, AlertCircle, Send, User } from 'lucide-react';
// 🟢 1. Importamos AxiosError para evitar el 'any'
import { AxiosError } from 'axios';

interface Opcion {
    id_opcion: number;
    texto: string;
}

interface Pregunta {
    id_pregunta: number;
    enunciado: string;
    puntos: number;
    opciones: Opcion[];
}

interface EvaluacionPublica {
    id_evaluacion: number;
    titulo: string;
    tipo: string;
    estado: boolean;
    capacitacion: {
        tema_principal: string;
        expositor_nombre: string;
    };
    preguntas: Pregunta[];
}

// Interface para la respuesta de error
interface ErrorResponse {
    error: string;
}

export default function EvaluacionPublicaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [evaluacion, setEvaluacion] = useState<EvaluacionPublica | null>(null);
    const [error, setError] = useState('');

    // Respuestas del usuario
    const [dni, setDni] = useState('');
    const [nombre, setNombre] = useState('');
    const [respuestas, setRespuestas] = useState<Record<number, number>>({});

    // Resultado
    const [resultado, setResultado] = useState<{ nota: number; maximo: number; aprobado: boolean } | null>(null);

    useEffect(() => {
        const cargarExamen = async () => {
            try {
                const { data } = await api.get(`/evaluaciones/${id}`);
                setEvaluacion(data);
            } catch (error) {
                // 🟢 2. Tipado correcto del error
                const err = error as AxiosError<ErrorResponse>;
                setError(err.response?.data?.error || "No se pudo cargar el examen. Verifique el enlace.");
            } finally {
                setLoading(false);
            }
        };
        cargarExamen();
    }, [id]);

    const handleSelectOpcion = (idPregunta: number, idOpcion: number) => {
        setRespuestas(prev => ({ ...prev, [idPregunta]: idOpcion }));
    };

    const handleSubmit = async () => {
        if (!dni || !nombre) return alert("Por favor ingresa tu DNI y Nombre");
        if (evaluacion && Object.keys(respuestas).length < evaluacion.preguntas.length) {
            return alert("Por favor responde todas las preguntas");
        }

        if (!confirm("¿Estás seguro de enviar tus respuestas?")) return;

        try {
            setLoading(true);
            const res = await api.post('/evaluaciones/intento', {
                id_evaluacion: id,
                dni,
                nombre,
                respuestas
            });
            setResultado(res.data);
            window.scrollTo(0, 0);
        } catch (err) {
            // 🟢 3. Usamos la variable 'err' para que ESLint no se queje (y para debug)
            console.error("Error enviando examen:", err);
            alert("Error al enviar el examen. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Cargando examen...</div>;

    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center max-w-md">
                <AlertCircle size={48} className="mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{error}</p>
            </div>
        </div>
    );

    if (resultado) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl text-center animate-in zoom-in">
                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${resultado.aprobado ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {resultado.aprobado ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        {resultado.aprobado ? '¡Felicitaciones!' : 'Sigue Intentando'}
                    </h1>
                    <p className="text-gray-500 mb-6">Has completado la evaluación.</p>

                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                        <p className="text-sm text-gray-500 uppercase font-bold">Tu Nota</p>
                        <div className="flex items-end justify-center gap-1 mt-1">
                            <span className={`text-5xl font-black ${resultado.aprobado ? 'text-green-600' : 'text-red-600'}`}>
                                {resultado.nota}
                            </span>
                            <span className="text-gray-400 text-xl font-medium mb-1">/ 20</span>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 🟢 4. Corrección de clase Tailwind: rounded-b-4xl */}
            <div className="bg-blue-700 text-white p-6 rounded-b-4xl shadow-lg mb-6">
                <span className="bg-blue-800/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {evaluacion?.tipo.replace('_', ' ')}
                </span>
                <h1 className="text-2xl font-bold mt-3 leading-tight">{evaluacion?.titulo}</h1>
                <p className="text-blue-100 text-sm mt-2 flex items-center gap-2">
                    <User size={16} /> {evaluacion?.capacitacion.expositor_nombre}
                </p>
            </div>

            <div className="max-w-md mx-auto px-4 space-y-6">

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Mis Datos</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">DNI *</label>
                            <input
                                type="tel"
                                value={dni}
                                onChange={e => setDni(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-lg font-medium outline-none focus:border-blue-500 transition"
                                placeholder="Ingresa tu DNI"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo *</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
                                placeholder="Tus Nombres y Apellidos"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {evaluacion?.preguntas.map((preg, index) => (
                        <div key={preg.id_pregunta} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex gap-3 mb-3">
                                <span className="bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shrink-0">
                                    {index + 1}
                                </span>
                                <h3 className="font-bold text-gray-800 text-lg leading-snug">
                                    {preg.enunciado}
                                </h3>
                            </div>

                            <div className="space-y-2 pl-2">
                                {preg.opciones.map((op) => {
                                    const isSelected = respuestas[preg.id_pregunta] === op.id_opcion;
                                    return (
                                        <button
                                            key={op.id_opcion}
                                            onClick={() => handleSelectOpcion(preg.id_pregunta, op.id_opcion)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium shadow-sm'
                                                    : 'border-gray-100 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {op.texto}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    <Send size={24} /> Enviar Evaluación
                </button>
            </div>
        </div>
    );
}