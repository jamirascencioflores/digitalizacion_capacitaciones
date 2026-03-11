'use client';

import { Mail, MapPin, Phone, User, MessageSquare, Building2, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/services/api'; // Asegúrate de que esta ruta sea correcta
import { AxiosError } from 'axios';

// 🟢 INTERFAZ DE DATOS
interface ContactFormData {
    nombre: string;
    empresa: string;
    codigoPais: string; // Opcional, se inyectará +51 por defecto si no se incluye
    telefono: string;
    email: string;
    mensaje: string;
}

export default function ContactSection() {
    // Estados visuales originales
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Estados lógicos nuevos
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ tipo: 'exito' | 'error', mensaje: string } | null>(null);

    // Configuración del formulario
    const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>();

    // 🟢 FUNCIÓN DE ENVÍO REAL
    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);
        setToast(null);

        try {
            let telefonoLimpio = data.telefono.replace(/\s+/g, ''); // Quita espacios si los puso
            if (!telefonoLimpio.startsWith('+')) {
                telefonoLimpio = '+51' + telefonoLimpio; // Le inyecta el +51 de Perú por defecto
            }

            const datosParaEnviar = { ...data, telefono: telefonoLimpio };

            await api.post('/contacto', datosParaEnviar);

            setToast({ tipo: 'exito', mensaje: '¡Solicitud enviada! Nos contactaremos pronto.' });
            reset();

            setTimeout(() => setToast(null), 5000);
        } catch (error) {
            const err = error as AxiosError<{ error: string }>;
            const msgError = err.response?.data?.error || 'Ocurrió un error al enviar el mensaje.';
            setToast({ tipo: 'error', mensaje: msgError });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contacto" className="relative py-24 bg-white dark:bg-gray-950 transition-colors duration-300 overflow-hidden">

            {/* decoración de fondo */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                        Hablemos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Tu Proyecto</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Estamos listos para escalar la seguridad de tu empresa al siguiente nivel.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* información de contacto (IZQUIERDA) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-slate-900 dark:bg-gray-900 backdrop-blur-md p-8 rounded-3xl border border-white/10 dark:border-gray-800 hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <h3 className="text-2xl font-bold text-white mb-6 relative z-10">Información de Contacto</h3>
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover/item:scale-110 transition-transform">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1">Llámanos</p>
                                        <p className="text-white font-medium hover:text-blue-400 transition-colors cursor-pointer">+51 987 654 321</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group/item">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover/item:scale-110 transition-transform">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1">Escríbenos</p>
                                        <p className="text-white font-medium hover:text-emerald-400 transition-colors cursor-pointer">contacto@formapp.pe</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 dark:bg-gray-900 backdrop-blur-md p-8 rounded-3xl border border-white/10 dark:border-gray-800 relative overflow-hidden group transition-all duration-300">
                            <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                                <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,#3b82f6_0%,transparent_60%)] blur-3xl opacity-30"></div>
                            </div>
                            <div className="relative z-10 flex flex-col justify-center">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/30 mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <MapPin size={24} />
                                </div>
                                <h4 className="text-white font-bold text-xl mb-2 tracking-tight">Cobertura Nacional</h4>
                                <p className="text-slate-300 dark:text-gray-300 text-sm leading-relaxed">
                                    Digitalizamos procesos en todo el Perú. Operación <span className="text-blue-400 font-semibold">100% remota</span> con soporte presencial estratégico.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* formulario (DERECHA) */}
                    <div className="lg:col-span-7">
                        <div className="bg-white dark:bg-gray-900 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-2xl relative overflow-hidden transition-colors duration-300">

                            {/* borde superior */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50"></div>

                            {/* 🟢 ALERTA FLOTANTE INTEGRADA AL DISEÑO */}
                            {toast && (
                                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${toast.tipo === 'exito' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                                    }`}>
                                    {toast.tipo === 'exito' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                    <p className="font-medium text-sm">{toast.mensaje}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wide">Nombre</label>
                                        <div className={`relative group transition-all duration-300 ${focusedField === 'nombre' ? 'scale-[1.02]' : ''}`}>
                                            <div className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                                <User size={18} />
                                            </div>
                                            {/* 🟢 CONECTADO CON REGISTER */}
                                            <input
                                                type="text"
                                                {...register("nombre", { required: "El nombre es obligatorio" })}
                                                onFocus={() => setFocusedField('nombre')}
                                                onBlur={(e) => {
                                                    register("nombre").onBlur(e);
                                                    setFocusedField(null);
                                                }}
                                                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 dark:text-slate-600 text-slate-900 dark:text-white ${errors.nombre ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'}`}
                                                placeholder="Nombre completo"
                                            />
                                        </div>
                                        {errors.nombre && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.nombre.message}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="company" className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wide">Empresa</label>
                                        <div className={`relative group transition-all duration-300 ${focusedField === 'empresa' ? 'scale-[1.02]' : ''}`}>
                                            <div className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                                <Building2 size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                {...register("empresa", { required: "La empresa es obligatoria" })}
                                                onFocus={() => setFocusedField('empresa')}
                                                onBlur={(e) => {
                                                    register("empresa").onBlur(e);
                                                    setFocusedField(null);
                                                }}
                                                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 dark:text-slate-600 text-slate-900 dark:text-white ${errors.empresa ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'}`}
                                                placeholder="Tu empresa"
                                            />
                                        </div>
                                        {errors.empresa && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.empresa.message}</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-xs font-semibold text-slate-500 dark:text-gray-400 ml-1 uppercase tracking-wide">Email Corporativo</label>
                                    <div className={`relative group transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
                                        <div className={`absolute left-4 top-3.5 transition-colors duration-300 ${focusedField === 'email' ? 'text-blue-500' : 'text-slate-400'}`}>
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            {...register("email", {
                                                required: "El correo es obligatorio",
                                                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Correo inválido" }
                                            })}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={(e) => {
                                                register("email").onBlur(e);
                                                setFocusedField(null);
                                            }}
                                            className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-800/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 dark:text-gray-500 text-slate-900 dark:text-white ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'}`}
                                            placeholder="nombre@empresa.com"
                                        />
                                    </div>
                                    {errors.email && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.email.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="telefono" className="text-xs font-semibold text-slate-500 dark:text-gray-400 ml-1 uppercase tracking-wide">WhatsApp / Celular</label>

                                    <div className={`relative flex group transition-all duration-300 ${focusedField === 'telefono' ? 'scale-[1.01]' : ''}`}>

                                        {/* 🟢 SELECTOR DE CÓDIGO DE PAÍS */}
                                        <select
                                            {...register("codigoPais")}
                                            defaultValue="+51"
                                            className="w-28 pl-3 pr-2 py-3 bg-slate-100 dark:bg-gray-800 border border-r-0 border-slate-200 dark:border-gray-700 rounded-l-xl outline-none text-slate-700 dark:text-gray-300 font-medium cursor-pointer focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all z-10"
                                        >
                                            <option value="+51">🇵🇪 +51</option>
                                            <option value="+56">🇨🇱 +56</option>
                                            <option value="+57">🇨🇴 +57</option>
                                            <option value="+52">🇲🇽 +52</option>
                                            <option value="+54">🇦🇷 +54</option>
                                            <option value="+593">🇪🇨 +593</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+34">🇪🇸 +34</option>
                                        </select>

                                        {/* 🟢 INPUT DEL NÚMERO */}
                                        <div className="relative flex-1">
                                            <div className={`absolute left-3 top-3.5 transition-colors duration-300 ${focusedField === 'telefono' ? 'text-blue-500' : 'text-slate-400'}`}>
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="tel"
                                                {...register("telefono", {
                                                    required: "El celular es obligatorio",
                                                    pattern: { value: /^\d{8,12}$/, message: "Ingresa un número válido" }
                                                })}
                                                onFocus={() => setFocusedField('telefono')}
                                                onBlur={(e) => {
                                                    register("telefono").onBlur(e);
                                                    setFocusedField(null);
                                                }}
                                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800/50 border rounded-r-xl outline-none transition-all placeholder:text-slate-400 dark:text-gray-500 text-slate-900 dark:text-white ${errors.telefono ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'}`}
                                                placeholder="987 654 321"
                                            />
                                        </div>
                                    </div>
                                    {errors.telefono && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.telefono.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-xs font-semibold text-slate-500 dark:text-gray-400 ml-1 uppercase tracking-wide">Mensaje</label>
                                    <div className={`relative group transition-all duration-300 ${focusedField === 'mensaje' ? 'scale-[1.01]' : ''}`}>
                                        <div className={`absolute left-4 top-3.5 transition-colors duration-300 ${focusedField === 'mensaje' ? 'text-blue-500' : 'text-slate-400'}`}>
                                            <MessageSquare size={18} />
                                        </div>
                                        <textarea
                                            rows={4}
                                            {...register("mensaje", { required: "Por favor, cuéntanos sobre tu proyecto" })}
                                            onFocus={() => setFocusedField('mensaje')}
                                            onBlur={(e) => {
                                                register("mensaje").onBlur(e);
                                                setFocusedField(null);
                                            }}
                                            className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-gray-800/50 border rounded-xl outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none ${errors.mensaje ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'}`}
                                            placeholder="Detalles sobre tu proyecto..."
                                        ></textarea>
                                    </div>
                                    {errors.mensaje && <span className="text-red-500 text-xs font-bold mt-1 block">{errors.mensaje.message}</span>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isSubmitting ? (
                                            <><Loader2 className="animate-spin" size={20} /> Enviando...</>
                                        ) : (
                                            <>{'Enviar Solicitud'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}