'use client';

import React from 'react';
import { X } from 'lucide-react';

interface BotNotificationProps {
    notification: string | null;
    currentView: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function BotNotification({
    notification,
    currentView,
    isOpen,
    onClose
}: BotNotificationProps) {
    if (isOpen || !notification) return null;

    return (
        <div className="mb-4 mr-2 max-w-xs animate-fade-in origin-bottom-right z-50 pointer-events-auto">
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
                        onClose();
                    }}
                    className={`absolute -top-3 -right-3 w-8 h-8 ${currentView === 'login' ? 'bg-white text-indigo-500' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-300'} rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-500 transition-all active:scale-90 group/close z-[60]`}
                >
                    <X size={16} className="group-hover/close:rotate-90 transition-transform" />
                </button>

                <div className={`absolute -bottom-1.5 right-5 w-3 h-3 ${currentView === 'login' ? 'bg-indigo-600 border-indigo-400' : 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-700'} rotate-45 border-b border-r`}></div>
            </div>
        </div>
    );
}
