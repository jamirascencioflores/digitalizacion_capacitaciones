'use client';
import React, { useState, useRef } from 'react';
import { X, FileText, Download, Shield, Cookie, Scale, Bot, CheckCircle, Loader } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// el logo se puede importar por defecto o usar ruta absoluta
const logo = '/Logo Nos Planet.png';

interface Section {
    title: string;
    icon: any; // los iconos de lucide son difíciles de tipar estrictamente sin importaciones específicas
    body: string;
}

interface Config {
    titleHeader: string;
    subHeader: string;
    fileName: string;
    docCode: string;
    intro: string;
    sections: Section[];
}

interface TermsModalProps {
    onClose: () => void;
    type?: 'web' | 'bot';
}

const TermsModal: React.FC<TermsModalProps> = ({ onClose, type = 'web' }) => {
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const isBot = type === 'bot';

    // configuración de contenido
    const config: Config = isBot ? {
        titleHeader: "TÉRMINOS DE SERVICIO PLANET BOT",
        subHeader: "ASISTENTE INTELIGENTE - FORMAPP",
        fileName: "Terminos_PlanetBot_Formapp.pdf",
        docCode: "DOC-FOR-2026",
        intro: "Este documento establece las condiciones de uso del asistente virtual Planet Bot dentro de la plataforma Formapp. Al interactuar con el bot, usted acepta estas condiciones.",
        sections: [
            { title: "1. PROPÓSITO DEL ASISTENTE", icon: Bot, body: "Planet Bot es una herramienta diseñada para brindar soporte y orientación sobre la plataforma Formapp y la digitalización de capacitación corporativa." },
            { title: "2. INTERACCIÓN Y USO", icon: CheckCircle, body: "El usuario se compromete a realizar consultas relacionadas con la eficiencia operativa y el uso de Formapp. Nos reservamos el derecho de limitar el acceso ante usos indebidos." },
            { title: "3. LIMITACIÓN DE IA", icon: Scale, body: "Las respuestas son generadas por IA y pueden contener imprecisiones técnicas. Verifique siempre los procesos críticos en su panel de administración." },
            { title: "4. PRIVACIDAD Y DATOS", icon: Shield, body: "Las conversaciones se procesan para optimizar el soporte. Formapp garantiza la confidencialidad de la información corporativa y académica compartida." }
        ]
    } : {
        titleHeader: "TÉRMINOS Y POLÍTICAS WEB",
        subHeader: "SITIO WEB OFICIAL - FORMAPP",
        fileName: "Legal_Web_Formapp.pdf",
        docCode: "DOC-WEB-2026",
        intro: "Bienvenido a la plataforma digital de Formapp. A continuación se detallan los términos legales que rigen el uso de este sitio web y herramientas digitales.",
        sections: [
            { title: "1. TÉRMINOS GENERALES", icon: Scale, body: "El acceso a Formapp implica la aceptación plena de estas condiciones. El contenido es propiedad intelectual de la empresa y está protegido por normativas internacionales." },
            { title: "2. POLÍTICA DE PRIVACIDAD", icon: Shield, body: "Nos comprometemos a proteger sus datos personales y corporativos. Su información de contacto solo se usa para fines de soporte y mejora del servicio." },
            { title: "3. USO DE COOKIES", icon: Cookie, body: "Este sitio utiliza cookies para optimizar la experiencia de gestión de formularios y reportes. Al continuar navegando, usted acepta nuestra política." },
            { title: "4. PROPIEDAD INTELECTUAL", icon: FileText, body: "Queda prohibida la reproducción total o parcial de logos, flujos, imágenes y software de Formapp sin autorización expresa." }
        ]
    };

    const handleDownload = async () => {
        if (!contentRef.current) return;

        try {
            setIsGenerating(true);
            const element = contentRef.current;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            const widthInPdf = pdfWidth;
            const heightInPdf = widthInPdf / ratio;

            let heightLeft = heightInPdf;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, widthInPdf, heightInPdf);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, widthInPdf, heightInPdf);
                heightLeft -= pdfHeight;
            }

            pdf.save(config.fileName);

        } catch (error) {
            console.error("Error generando PDF:", error);
            alert(`Hubo un error al generar el documento: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in printable-modal">
            <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">

                <div className="bg-gray-900 text-white p-3.5 flex items-center justify-between shadow-lg z-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-lg border border-white/10">
                            <FileText size={20} className="text-gray-300" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-gray-100 tracking-wide">{config.fileName}</h3>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${isBot ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                                <span>{isBot ? 'Documentación Planet Bot' : 'Legal Sitio Web'}</span>
                                <span className="text-gray-600">•</span>
                                <span>Vista Previa</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className={`
                                bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide 
                                transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 active:scale-95
                                ${isGenerating ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {isGenerating ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                            {isGenerating ? 'GENERANDO...' : 'DESCARGAR PDF'}
                        </button>
                        <div className="h-8 w-px bg-gray-700 mx-2"></div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/50 p-6 sm:p-10 flex justify-center custom-scrollbar">

                    <div ref={contentRef} className="bg-[#ffffff] w-full max-w-[21cm] min-h-[29.7cm] shadow-xl p-8 sm:p-12 pt-8 relative text-[#1f2937] scale-on-capture origin-top">

                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 opacity-[0.04] pointer-events-none grayscale">
                            <img src={logo} alt="" className="w-full" />
                        </div>

                        <div className="flex justify-between items-end border-b-2 border-[#4f46e5] pb-4 mb-6">
                            <img src={logo} alt="Formapp Logo" className="w-40 object-contain" />
                            <div className="text-right">
                                <h1 className="text-2xl font-bold text-[#111827] tracking-tight uppercase">{config.titleHeader}</h1>
                                <p className="text-[#4f46e5] font-bold text-xs uppercase tracking-widest mt-1">{config.subHeader}</p>
                                <p className="text-[#9ca3af] text-[10px] font-mono mt-2">REF: {config.docCode}</p>
                            </div>
                        </div>

                        <div className="mb-6 p-4 bg-[#f9fafb] border-l-4 border-[#d1d5db] text-sm text-[#4b5563] italic leading-relaxed text-justify">
                            {config.intro}
                        </div>

                        <div className="space-y-6">
                            {config.sections.map((section, index) => (
                                <section key={index}>
                                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[#f3f4f6]">
                                        <div className="bg-[#eef2ff] p-1.5 rounded text-[#4f46e5]">
                                            <section.icon size={18} />
                                        </div>
                                        <h2 className="text-base font-bold text-[#111827] uppercase tracking-wide">{section.title}</h2>
                                    </div>
                                    <p className="text-sm text-[#4b5563] leading-7 text-justify pl-1">
                                        {section.body}
                                    </p>
                                </section>
                            ))}
                        </div>

                        <div className="mt-12 pt-6 border-t border-[#e5e7eb] flex flex-col items-center text-center">
                            <div className="w-full flex justify-center mb-6">
                                <div className="border-2 border-dashed border-[#d1d5db] w-56 h-20 flex items-center justify-center relative rounded-sm">
                                    <span className="absolute -top-2.5 bg-[#ffffff] px-2 text-[10px] text-[#9ca3af] font-bold tracking-widest">SELLO DIGITAL</span>
                                    <img src={logo} alt="" className="h-10 opacity-30 grayscale" />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-[#1f2937] tracking-wide">PLATAFORMA FORMAPP</p>
                            <p className="text-[10px] text-[#6b7280] mt-1 uppercase tracking-wider">Gestión Digital de Capacitaciones</p>
                            <p className="text-[10px] text-[#4f46e5] opacity-70 mt-4 font-mono">
                                DOCUMENTO GENERADO AUTOMÁTICAMENTE | {new Date().getFullYear()}
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default TermsModal;
