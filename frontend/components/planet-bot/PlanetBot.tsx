'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { usePathname } from 'next/navigation';

// Componentes
import SuggestedQuestions, { QuestionItem } from './SuggestedQuestions';
import TermsModal from './TermsModal';
import ChatWindow from './ChatWindow';
import BotNotification from './BotNotification';
import FloatingButton from './FloatingButton';
import api from '@/services/api';

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
    // 🟢 ESTADO MAESTRO PARA MOSTRAR/OCULTAR EL BOT
    const [mostrarBot, setMostrarBot] = useState<boolean>(false);

    // 🟢 Determinar la vista actual basada en la ruta
    const currentView = propView || (
        pathname.includes('/dashboard') ? 'admin' :
            pathname.includes('/login') ? 'login' : 'landing'
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    // 🟢 LECTURA DE BASE DE DATOS Y ESCUCHA DE EVENTOS
    useEffect(() => {
        const fetchBotStatus = async () => {
            try {
                const { data } = await api.get('/empresa');
                if (currentView === 'admin') {
                    setMostrarBot(data.bot_interno_activo);
                } else {
                    setMostrarBot(data.bot_activo);
                }
            } catch (error) {
                console.error("Error verificando estado del bot:", error);
                setMostrarBot(false);
            }
        };
        fetchBotStatus(); // Primera lectura al cargar

        // 🟢 NUEVO: Que el bot pregunte cada 1 minuto (60000 ms) a la base de datos
        const intervaloBot = setInterval(() => {
            fetchBotStatus();
        }, 60000);

        const handleBotChange = (e: any) => {
            const { tipo, estado } = e.detail;
            if (currentView === 'admin' && tipo === 'interno') setMostrarBot(estado);
            else if (currentView !== 'admin' && tipo === 'publico') setMostrarBot(estado);
        };

        window.addEventListener('bot_global_changed', handleBotChange);

        // 🟢 Importante: Limpiar el intervalo cuando el usuario se vaya
        return () => {
            window.removeEventListener('bot_global_changed', handleBotChange);
            clearInterval(intervaloBot);
        };
    }, [currentView]);

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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
            console.error("Gemini Error:", error);
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: "Lo siento, tuve un problema al conectarme con la central de Formapp.",
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

    // 🟢 No mostrar el bot en páginas de autenticación (Login, Recuperación, etc.)
    const isAuthPage = pathname.includes('/login') ||
        pathname.includes('/reset-password') ||
        pathname.includes('/change-password');

    if (isAuthPage || !mostrarBot) return null;


    return (
        <>
            {showTerms && <TermsModal type="bot" onClose={() => setShowTerms(false)} />}

            <div className={`fixed z-[9999] flex flex-col pointer-events-none transition-all duration-500 
                ${currentView === 'admin'
                    ? 'right-6 top-1/2 -translate-y-1/2 items-end'
                    : 'bottom-4 right-4 sm:bottom-6 sm:right-6 items-end'}`}>

                <BotNotification
                    notification={notification}
                    currentView={currentView}
                    isOpen={isOpen}
                    onClose={() => setNotification(null)}
                />

                <ChatWindow
                    isOpen={isOpen}
                    isLoading={isLoading}
                    messages={messages}
                    input={input}
                    mounted={mounted}
                    messagesEndRef={messagesEndRef}
                    botImage={botImage}
                    setInput={setInput}
                    setIsOpen={setIsOpen}
                    setShowTerms={setShowTerms}
                    handleSendMessage={handleSendMessage}
                    handleKeyPress={handleKeyPress}
                />

                <FloatingButton
                    isOpen={isOpen}
                    currentView={currentView}
                    botImage={botImage}
                    onClick={() => setIsOpen(!isOpen)}
                />
            </div>
        </>
    );
};

export default PlanetBot;