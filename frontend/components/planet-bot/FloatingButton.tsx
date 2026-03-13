'use client';

import React from 'react';
import { X } from 'lucide-react';

interface FloatingButtonProps {
    isOpen: boolean;
    currentView: string;
    botImage: string;
    onClick: () => void;
}

export default function FloatingButton({
    isOpen,
    currentView,
    botImage,
    onClick
}: FloatingButtonProps) {
    return (
        <button
            onClick={onClick}
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
    );
}
