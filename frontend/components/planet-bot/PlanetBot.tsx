'use client';
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { X, Send, Sparkles, Info } from 'lucide-react';
import SuggestedQuestions, { QuestionItem } from './SuggestedQuestions';
import TermsModal from './TermsModal';

const botImage = '/Planet_bot_Formapp.png';

const FORMAPP_TIPS: string[] = [
    "💡 ¿Sabías que? Digitalizar tus capacitaciones ahorra un 70% en costos logísticos.",
    "🚀 ¡Formapp permite crear formularios inteligentes en segundos!",
    "📱 Tus colaboradores pueden completar sus capacitaciones desde cualquier dispositivo.",
    "📊 Obtén reportes en tiempo real sobre el progreso de tu equipo.",
    "🔒 La seguridad de tus datos es nuestra prioridad número uno.",
    "🌍 Menos papel significa procesos más sostenibles y eficientes.",
    "✨ Personaliza tus formularios con la identidad de tu marca."
];

import { usePathname } from 'next/navigation';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface PlanetBotProps {
    currentView?: 'landing' | 'admin' | 'login' | string;
}

const PlanetBot: React.FC<PlanetBotProps> = ({ currentView: propView }) => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // determinar la vista actual basada en la ruta si no se envía por prop
    const currentView = propView || (
        pathname.includes('/dashboard') ? 'admin' :
            pathname.includes('/login') ? 'login' : 'landing'
    );
    const [showTerms, setShowTerms] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "¡Hola! Soy Planet Bot 🤖 de Formapp. Estoy aquí para ayudarte a digitalizar y optimizar tus capacitaciones. ¿En qué puedo apoyarte hoy?",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [notification, setNotification] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isLoading]);

    useEffect(() => {
        if (currentView === 'admin') {
            setNotification(null);
            return;
        }

        if (currentView === 'login') {
            setNotification("🔒 Panel de acceso seguro para administradores de Formapp.");
            return;
        }

        const intervalId = setInterval(() => {
            if (!isOpen && !notification && currentView === 'landing') {
                const randomTip = FORMAPP_TIPS[Math.floor(Math.random() * FORMAPP_TIPS.length)];
                setNotification(randomTip);

                setTimeout(() => {
                    setNotification(null);
                }, 6000);
            }
        }, 12000);

        return () => clearInterval(intervalId);
    }, [isOpen, notification, currentView]);


    const handleSendMessage = async (textOrObj: string | QuestionItem) => {
        let messageText = '';
        let predefinedAnswer: string | null = null;

        if (typeof textOrObj === 'object' && 'question' in textOrObj) {
            messageText = textOrObj.question;
            predefinedAnswer = textOrObj.answer;
        } else {
            messageText = typeof textOrObj === 'string' ? textOrObj : input;
        }

        if (!messageText.trim()) return;

        const userMessage: Message = {
            id: Date.now(),
            text: messageText,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        if (predefinedAnswer) {
            setTimeout(() => {
                const botMessage: Message = {
                    id: Date.now() + 1,
                    text: predefinedAnswer!,
                    sender: 'bot',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, botMessage]);
                setIsLoading(false);
            }, 600);
            return;
        }

        try {
            const rawApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const apiKey = rawApiKey?.trim();

            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey.length < 10) {
                throw new Error('API Key no configurada o inválida');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const systemPrompt = `
                Eres Planet Bot, el asistente inteligente de Formapp.
                CONTEXTO DE FORMAPP:
                - Formapp es una plataforma SaaS diseñada para la digitalización de capacitaciones y formularios corporativos.
                - Nuestra meta es eliminar el uso de papel y optimizar la recolección de datos en tiempo real.
                - Ofrecemos: Creación de formularios, seguimiento de progreso, reportes automáticos y acceso multi-dispositivo.
                
                TU ROL:
                - Responder dudas sobre cómo usar Formapp, sus beneficios y características técnicas.
                - Ser profesional, innovador y usar emojis relacionados con tecnología (🚀, 📊, 📱).
                - Mantener un tono servicial enfocado en la eficiencia operativa.
                - Respuestas concisas y directas (max 3 oraciones).
            `;

            // formatear el historial para el sdk de gemini
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt + "\n\nEntendido, comenzaré a responder como Planet Bot." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "¡Hola! Soy Planet Bot 🤖 de Formapp. Estoy listo para ayudarte con la digitalización de tus capacitaciones. ¿Qué deseas saber?" }],
                    },
                    ...messages.slice(1).map(m => ({
                        role: m.sender === 'user' ? 'user' : 'model',
                        parts: [{ text: m.text }],
                    })),
                ],
            });

            const result = await chat.sendMessage(messageText);
            const response = await result.response;
            const text = response.text();

            const botMessage: Message = {
                id: Date.now() + 1,
                text: text,
                sender: 'bot',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            console.error("Gemini Error Details:", {
                message: error.message,
                status: error.status,
                stack: error.stack
            });

            let errorMessage = "Lo siento, tuve un problema al conectarme con la central de Formapp.";
            if (error.message?.includes('404')) {
                errorMessage = "Error de configuración: El modelo de IA no está disponible con esta clave o en esta región.";
            } else if (error.message?.includes('403')) {
                errorMessage = "Error de permisos: La API Key de Gemini parece ser inválida.";
            }
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: errorMessage,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(input);
        }
    };

    return (
        <>
            {showTerms && <TermsModal type="bot" onClose={() => setShowTerms(false)} />}

            <div className={`fixed z-[9999] flex flex-col pointer-events-none transition-all duration-500 
                ${currentView === 'admin'
                    ? 'right-6 top-1/2 -translate-y-1/2 items-end'
                    : 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end'}`}>

                {/* notificación (burbuja flotante) */}
                {!isOpen && notification && (
                    <div className="mb-4 mr-2 max-w-xs animate-fade-in origin-bottom-right z-50">
                        <div className={`
                            ${currentView === 'login'
                                ? 'bg-indigo-600 text-white border-indigo-400 animate-bounce-soft shadow-indigo-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-indigo-200 dark:border-indigo-700 shadow-[0_8px_16px_rgba(0,0,0,0.1)]'}
                            p-3.5 rounded-2xl rounded-tr-none border relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                        `}>
                            <div className="flex gap-2.5 items-start">
                                <div className={`${currentView === 'login' ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/40'} p-1 rounded-full shrink-0`}>
                                    <span className="text-base">{currentView === 'login' ? '🔒' : '✨'}</span>
                                </div>
                                <p className="text-sm font-semibold leading-snug pt-0.5" style={{ textWrap: 'balance' }}>
                                    {notification}
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setNotification(null);
                                }}
                                className={`pointer-events-auto absolute -top-3 -right-3 w-8 h-8 ${currentView === 'login' ? 'bg-white text-indigo-500' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-300'} rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-500 transition-all active:scale-90 group/close z-[60]`}
                            >
                                <X size={16} className="group-hover/close:rotate-90 transition-transform" />
                            </button>

                            <div className={`absolute -bottom-1.5 right-5 w-3 h-3 ${currentView === 'login' ? 'bg-indigo-600 border-indigo-400' : 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700'} rotate-45 border-b border-r`}></div>
                        </div>
                    </div>
                )}

                {/* ventana del chat */}
                <div
                    className={`
            pointer-events-auto mb-4 w-[90vw] sm:w-[380px] max-h-[85vh]
            bg-white dark:bg-gray-900 rounded-2xl shadow-2xl 
            border border-indigo-100 dark:border-indigo-900
            overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
            ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none h-0 mb-0'}
            `}
                >
                    {/* cabecera */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-white border border-white/40 flex items-center justify-center overflow-hidden">
                                    <img src={botImage} alt="Planet Bot" className="w-full h-full object-contain" />
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-400 border-2 border-white rounded-full animate-pulse"></span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight tracking-wide">Planet Bot</h3>
                                <p className="text-[11px] text-blue-50 font-medium flex items-center gap-1 opacity-90">
                                    <Sparkles size={10} /> Soporte Inteligente Formapp
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowTerms(true)}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95 text-white/90"
                            >
                                <Info size={18} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <SuggestedQuestions onSelectQuestion={handleSendMessage} disabled={isLoading} />

                    {/* mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 dark:bg-gray-950/30 scroll-smooth custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed
                    ${msg.sender === 'user'
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'}
                    `}
                                >
                                    {msg.text}
                                    <div className={`text-[10px] mt-1.5 opacity-70 flex justify-end ${msg.sender === 'user' ? 'text-blue-50' : 'text-gray-400'}`}>
                                        {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* área de entrada */}
                    <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full border border-transparent mx-1 focus-within:border-indigo-500/50 transition-all">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-800 dark:text-gray-100 outline-none placeholder:text-gray-400"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSendMessage(input)}
                                disabled={isLoading || !input.trim()}
                                className={`
                    p-2.5 rounded-full transition-all duration-200 flex-shrink-0
                    ${input.trim()
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transform hover:scale-105 active:scale-95'
                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}
                `}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* botón flotante */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="pointer-events-auto group relative flex items-center justify-center outline-none"
                >
                    <div className={`absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 duration-1000 group-hover:duration-700 
                        ${(isOpen || currentView === 'admin') ? 'hidden' : 'block'}`}></div>
                    <div className={`
            w-14 h-14 sm:w-16 sm:h-16 rounded-full 
            ${currentView === 'admin' ? '' : 'shadow-[0_8px_30px_rgba(0,0,0,0.12)]'}
            flex items-center justify-center transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) cursor-pointer
            bg-gradient-to-tr from-blue-600 to-indigo-700 text-white border-4 border-white dark:border-gray-800 z-10
            ${isOpen ? 'rotate-90 scale-90 bg-gray-700' : 'hover:scale-110 hover:-translate-y-1'}
            `}>
                        {isOpen ? (
                            <X size={28} strokeWidth={2.5} />
                        ) : (
                            <div className="w-full h-full relative flex items-center justify-center rounded-full overflow-hidden bg-white">
                                <img
                                    src={botImage}
                                    alt="Chat"
                                    className="w-full h-full object-contain"
                                />
                                <span className="absolute top-1 right-1 w-3 h-3 bg-indigo-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm z-20"></span>
                            </div>
                        )}
                    </div>
                </button>
            </div>
        </>
    );
};

export default PlanetBot;
