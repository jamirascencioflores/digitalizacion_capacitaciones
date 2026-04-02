'use client';

import { useState, useEffect, use } from 'react';
import api from '@/services/api';
import { CheckCircle, AlertCircle, Send, User, CheckCircle2, X } from 'lucide-react';
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

interface ErrorResponse {
    error: string;
}

export default function EvaluacionPublicaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [evaluacion, setEvaluacion] = useState<EvaluacionPublica | null>(null);
    const [error, setError] = useState('');

    // Respuestas y Datos del usuario
    const [dni, setDni] = useState('');
    const [nombre, setNombre] = useState('');
    const [respuestas, setRespuestas] = useState<Record<number, number>>({});

    // Estados de UI (Alertas y Modales)
    const [mensajeAlerta, setMensajeAlerta] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resultado
    const [resultado, setResultado] = useState<{ nota: number; maximo: number; aprobado: boolean } | null>(null);

    useEffect(() => {
        const cargarExamen = async () => {
            try {
                const { data } = await api.get(`/evaluaciones/${id}`);
                setEvaluacion(data);
            } catch (error) {
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
        // Si hay una alerta de error visible, la quitamos al empezar a responder
        if (mensajeAlerta) setMensajeAlerta(null);
    };

    // 🟢 1. Función para validar antes de abrir el modal
    const triggerSubmit = () => {
        if (!dni || !nombre) {
            setMensajeAlerta({ tipo: 'error', texto: 'Por favor, ingresa tu DNI y Nombre Completo.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (evaluacion && Object.keys(respuestas).length < evaluacion.preguntas.length) {
            setMensajeAlerta({ tipo: 'error', texto: 'Por favor, responde todas las preguntas antes de enviar.' });
            return;
        }

        setShowConfirmModal(true);
    };

    // 🟢 2. Función que realmente envía los datos al backend
    const confirmSubmit = async () => {
        setShowConfirmModal(false);
        setIsSubmitting(true);

        try {
            const res = await api.post('/evaluaciones/intento', {
                id_evaluacion: id,
                dni,
                nombre,
                respuestas
            });
            setResultado(res.data);
            window.scrollTo(0, 0);
        } catch (err) {
            console.error("Error enviando examen:", err);
            setMensajeAlerta({ tipo: 'error', texto: 'Ocurrió un error al enviar tus respuestas. Inténtalo de nuevo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pantalla de Carga
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
    );

    // Pantalla de Error (Enlace caído o examen cerrado)
    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white text-center p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Examen no disponible</h2>
                <p className="text-gray-500 font-medium">{error}</p>
            </div>
        </div>
    );

    // Pantalla de Resultado (Después de enviar)
    if (resultado) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-gray-100 text-center animate-in zoom-in duration-500">
                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${resultado.aprobado ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                        {resultado.aprobado ? <CheckCircle size={48} strokeWidth={2.5} /> : <AlertCircle size={48} strokeWidth={2.5} />}
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                        {resultado.aprobado ? '¡Felicitaciones!' : 'Sigue Intentando'}
                    </h1>
                    <p className="text-gray-500 font-medium mb-8">Has completado la evaluación con éxito.</p>

                    <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-2xl mb-8">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Tu Calificación</p>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className={`text-6xl font-black tracking-tighter ${resultado.aprobado ? 'text-green-600' : 'text-red-600'}`}>
                                {resultado.nota}
                            </span>
                            <span className="text-gray-400 text-2xl font-bold">/ 20</span>
                        </div>
                    </div>

                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-transform active:scale-95 shadow-lg">
                        Realizar otra vez
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">

            {/* 🟢 ALERTA FLOTANTE ESTANDARIZADA */}
            {mensajeAlerta && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-100 w-[95%] max-w-md p-4 rounded-xl flex items-start gap-3 shadow-2xl border transition-all animate-in slide-in-from-top-8 fade-in ${mensajeAlerta.tipo === 'error' ? 'bg-white border-red-500 text-red-800' : 'bg-white border-green-500 text-green-800'}`}>
                    <div className={`p-2 rounded-full ${mensajeAlerta.tipo === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                        {mensajeAlerta.tipo === 'error' ? <AlertCircle className="text-red-600" size={24} /> : <CheckCircle2 className="text-green-600" size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h4 className="font-extrabold text-sm">{mensajeAlerta.tipo === 'error' ? 'Acción Requerida' : 'Operación Exitosa'}</h4>
                        <p className="text-sm text-gray-600 mt-1">{mensajeAlerta.texto}</p>
                    </div>
                    <button type="button" onClick={() => setMensajeAlerta(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            )}

            {/* 🟢 MODAL DE CONFIRMACIÓN AL ENVIAR */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
                        <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-5 shadow-inner">
                            <Send size={28} className="ml-1" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 mb-3">¿Enviar Evaluación?</h3>
                        <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
                            Asegúrate de haber revisado bien todas tus respuestas. Una vez enviada, no podrás modificarla.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                Revisar
                            </button>
                            <button onClick={confirmSubmit} className="flex-1 py-3.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-200">
                                Sí, Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cabecera Principal */}
            <div className="bg-blue-700 text-white p-8 rounded-b-[2.5rem] shadow-lg mb-8 text-center md:text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="max-w-2xl mx-auto relative z-10">
                    <span className="inline-block bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-4 border border-white/10">
                        {evaluacion?.tipo.replace('_', ' ')}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 tracking-tight">
                        {evaluacion?.titulo}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-blue-100 font-medium bg-black/10 w-fit md:mx-0 mx-auto px-4 py-2 rounded-xl">
                        <User size={18} opacity={0.8} />
                        <span>Expositor: <strong className="text-white">{evaluacion?.capacitacion.expositor_nombre}</strong></span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 space-y-6">

                {/* Bloque de Datos Personales */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-extrabold text-gray-800 mb-6 text-lg flex items-center gap-2">
                        <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                        Mis Datos Personales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Número de DNI <span className="text-red-500">*</span></label>
                            <input
                                type="tel"
                                maxLength={8}
                                value={dni}
                                onChange={e => setDni(e.target.value.replace(/\D/g, ''))} // Solo números
                                className={`w-full border-2 rounded-xl px-4 py-3.5 text-base font-semibold outline-none transition-all ${mensajeAlerta && !dni ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}`}
                                placeholder="Ej. 76152140"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Nombre Completo <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                className={`w-full border-2 rounded-xl px-4 py-3.5 text-base font-semibold outline-none transition-all ${mensajeAlerta && !nombre ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'}`}
                                placeholder="Tus Nombres y Apellidos"
                            />
                        </div>
                    </div>
                </div>

                {/* Preguntas */}
                <div className="space-y-6">
                    {evaluacion?.preguntas.map((preg, index) => {
                        const faltaResponder = mensajeAlerta && !respuestas[preg.id_pregunta];

                        return (
                            <div key={preg.id_pregunta} className={`bg-white p-6 md:p-8 rounded-3xl shadow-sm border transition-all ${faltaResponder ? 'border-red-400 ring-4 ring-red-50' : 'border-gray-100'}`}>
                                <div className="flex gap-4 mb-5 items-start">
                                    <span className={`w-10 h-10 flex items-center justify-center rounded-xl font-extrabold text-sm shrink-0 shadow-sm ${respuestas[preg.id_pregunta] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {index + 1}
                                    </span>
                                    <h3 className="font-bold text-gray-800 text-lg md:text-xl leading-snug pt-1">
                                        {preg.enunciado}
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {preg.opciones.map((op) => {
                                        const isSelected = respuestas[preg.id_pregunta] === op.id_opcion;
                                        return (
                                            <button
                                                key={op.id_opcion}
                                                onClick={() => handleSelectOpcion(preg.id_pregunta, op.id_opcion)}
                                                className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all relative overflow-hidden flex items-center gap-3 ${isSelected
                                                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-md transform scale-[1.01]'
                                                        : 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                                                    }`}
                                            >
                                                {/* Radio button visual personalizado */}
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-blue-600' : 'border-gray-300'}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                                                </div>
                                                <span className={`font-medium ${isSelected ? 'font-bold' : ''}`}>
                                                    {op.texto}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Botón de Envío */}
                <div className="pt-6">
                    <button
                        onClick={triggerSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-extrabold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        ) : (
                            <>
                                <Send size={24} /> Finalizar y Enviar Evaluación
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}