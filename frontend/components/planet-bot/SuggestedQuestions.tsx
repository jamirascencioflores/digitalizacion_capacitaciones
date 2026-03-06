'use client';
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface QuestionItem {
    question: string;
    answer: string;
}

export const QUESTIONS_DATA: QuestionItem[] = [
    { question: "¿Qué es Formapp? 🤖", answer: "Formapp es la solución líder para digitalizar capacitaciones y formularios. Permitimos que las empresas eliminen el uso de papel y gestionen sus datos de manera inteligente y en tiempo real." },
    { question: "¿Cómo digitalizo mis capacitaciones? 📱", answer: "¡Es muy fácil! Con Formapp puedes cargar tu contenido, crear evaluaciones interactivas y distribuir los formularios a tu equipo de inmediato desde el panel de administración." },
    { question: "¿Cuáles son los beneficios? 🚀", answer: "Los principales beneficios son: ahorro de costos logísticos, reducción del impacto ambiental (Cero Papel), reportes automatizados y mayor tasa de finalización de capacitaciones." },
    { question: "¿Es seguro usar Formapp? 🔒", answer: "Totalmente. Contamos con protocolos de seguridad bancaria y almacenamiento en la nube encriptado para asegurar que toda la información académica y corporativa esté protegida." },
    { question: "¿Cómo obtengo reportes? 📊", answer: "Formapp genera dashboards automáticos. Podrás ver quién completó la capacitación, los puntajes obtenidos y exportar todo a Excel o PDF con un solo clic." },
    { question: "¿Funciona en celulares? 🤳", answer: "Sí, Formapp es 100% responsive. Tus colaboradores pueden acceder desde cualquier smartphone, tablet o computadora sin necesidad de instalar aplicaciones pesadas." },
    { question: "¿Qué soporte ofrecen? 🛠️", answer: "Ofrecemos soporte técnico 24/7 para planes corporativos, además de guías interactivas y asesoría personalizada para la migración de tus procesos físicos a digitales." }
];

interface SuggestedQuestionsProps {
    onSelectQuestion: (question: QuestionItem | string) => void;
    disabled?: boolean;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelectQuestion, disabled }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 200;
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    return (
        <div className="w-full bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 p-2 relative group">

            {/* flecha izquierda */}
            <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                disabled={disabled}
            >
                <ChevronLeft size={16} className="text-indigo-600 dark:text-indigo-400" />
            </button>

            {/* flecha derecha */}
            <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-gray-800/80 p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                disabled={disabled}
            >
                <ChevronRight size={16} className="text-indigo-600 dark:text-indigo-400" />
            </button>

            <div
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x px-6"
            >
                {QUESTIONS_DATA.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectQuestion(item)}
                        disabled={disabled}
                        className="
              snap-start
              whitespace-nowrap flex-shrink-0
              px-3 py-1.5 
              bg-white dark:bg-gray-800 
              border border-indigo-200 dark:border-indigo-800 
              rounded-full 
              text-xs font-medium text-indigo-700 dark:text-indigo-300 
              hover:bg-indigo-50 dark:hover:bg-indigo-900/30 
              active:scale-95 transition-all duration-200 
              shadow-sm hover:shadow-md
            "
                    >
                        {item.question}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SuggestedQuestions;
