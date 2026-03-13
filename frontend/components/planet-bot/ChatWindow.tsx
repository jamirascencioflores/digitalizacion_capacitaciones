'use client';

import React from 'react';
import { X, Sparkles, Info, Send } from 'lucide-react';
import SuggestedQuestions, { QuestionItem } from './SuggestedQuestions';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface ChatWindowProps {
    isOpen: boolean;
    isLoading: boolean;
    messages: Message[];
    input: string;
    mounted: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    botImage: string;
    setInput: (val: string) => void;
    setIsOpen: (val: boolean) => void;
    setShowTerms: (val: boolean) => void;
    handleSendMessage: (textOrObj: string | QuestionItem) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function ChatWindow({
    isOpen,
    isLoading,
    messages,
    input,
    mounted,
    messagesEndRef,
    botImage,
    setInput,
    setIsOpen,
    setShowTerms,
    handleSendMessage,
    handleKeyPress
}: ChatWindowProps) {
    return (
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
    );
}
