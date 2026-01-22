'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import { FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
    Search,
    Download,
    Calendar,
    MapPin,
    Loader2,
    FileX,
    Edit,
    Trash2,
    AlertTriangle,
    Users
} from 'lucide-react';
import { generarPDFUniversal } from '@/services/pdf.service';
import { getEmpresaConfig } from '@/services/empresa.service';

interface Capacitacion {
    id_capacitacion: number;
    codigo_acta: string;
    tema_principal: string;
    fecha: string;
    sede_empresa: string;
    expositor_nombre: string;
    total_horas: string;
    total_hombres: number;
    total_mujeres: number;
    total_trabajadores: number; // <--- AGREGADO
    usuarios?: { nombre: string };
}

export default function ReportesPage() {
    const { user } = useAuth();
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [descargandoId, setDescargandoId] = useState<number | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: number | null; codigo: string }>({
        show: false, id: null, codigo: ''
    });
    const [confirmCode, setConfirmCode] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [descargandoExcel, setDescargandoExcel] = useState(false);

    const fetchCapacitaciones = async () => {
        try {
            const { data } = await api.get('/capacitaciones');
            setCapacitaciones(data);
        } catch (error) {
            console.error("Error cargando reportes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCapacitaciones();
    }, []);

    const handleExportarExcel = async () => {
        try {
            setDescargandoExcel(true);
            const response = await api.get('/capacitaciones/exportar/excel', { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Reporte_General_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error(error);
            alert('Error al exportar Excel');
        } finally {
            setDescargandoExcel(false);
        }
    };

    const handleDescargarPDF = async (id: number) => {
        setDescargandoId(id);
        try {
            const empresa = await getEmpresaConfig();

            if (!empresa) {
                alert("Error: No se pudo cargar la configuración de la empresa.");
                return;
            }

            const { data: cap } = await api.get(`/capacitaciones/${id}`);

            const datosParaPDF = {
                ...cap,
                // 🟢 Estandarizamos el nombre para evitar fallos por el typo 'insitucion'
                institucion_procedencia: cap.institucion_procedencia || cap.insitucion_procedencia || '',
                // 🟢 Aseguramos que pasamos los documentos para el Anexo Fotográfico
                documentos: cap.documentos || []
            };

            await generarPDFUniversal(datosParaPDF, empresa);

        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("Hubo un error al generar el reporte PDF.");
        } finally {
            setDescargandoId(null);
        }
    };

    const openDeleteModal = (id: number, codigo: string) => {
        setDeleteModal({ show: true, id, codigo });
        setConfirmCode('');
    };

    const handleConfirmDelete = async () => {
        if (confirmCode !== deleteModal.codigo) {
            alert("El código ingresado no coincide.");
            return;
        }
        if (!deleteModal.id) return;

        setDeleting(true);
        try {
            await api.delete(`/capacitaciones/${deleteModal.id}`);
            setCapacitaciones(prev => prev.filter(c => c.id_capacitacion !== deleteModal.id));
            setDeleteModal({ show: false, id: null, codigo: '' });
            alert("Capacitación eliminada con éxito ✅");
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        } finally {
            setDeleting(false);
        }
    };

    const filtradas = capacitaciones.filter(c => {
        const texto = busqueda.toLowerCase();
        return (
            c.tema_principal.toLowerCase().includes(texto) ||
            c.codigo_acta.toLowerCase().includes(texto) ||
            c.expositor_nombre.toLowerCase().includes(texto) ||
            c.sede_empresa.toLowerCase().includes(texto)
        );
    });

    if (loading) return <div className="p-10 text-center text-gray-500 flex justify-center gap-2"><Loader2 className="animate-spin" /> Cargando reportes...</div>;

    return (
        <div className="space-y-6 relative">

            {/* Encabezado */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reportes y Actas</h1>
                    <p className="text-gray-500 text-sm">Gestiona y descarga los documentos oficiales.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleExportarExcel}
                    disabled={descargandoExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold transition shadow-sm disabled:opacity-50"
                >
                    {descargandoExcel ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                    Exportar Excel
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {filtradas.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs border-b">
                                <tr>
                                    <th className="px-6 py-4">Tema / Código</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Registrado Por</th>
                                    <th className="px-6 py-4 text-center">Asistentes</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtradas.map((cap) => (
                                    <tr key={cap.id_capacitacion} className="hover:bg-gray-50 transition group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{cap.tema_principal}</div>
                                            <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 font-mono">
                                                {cap.codigo_acta}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Calendar size={14} className="text-gray-400" />
                                                {new Date(cap.fecha).toLocaleDateString('es-PE')}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                <MapPin size={12} /> {cap.sede_empresa}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {cap.usuarios?.nombre?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-gray-700">{cap.usuarios?.nombre || 'Sistema'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-full w-fit mx-auto">
                                                <Users size={14} className="text-gray-500" />
                                                {/* USAMOS EL CAMPO CALCULADO O SUMAMOS COMO RESPALDO */}
                                                {cap.total_trabajadores || ((cap.total_hombres || 0) + (cap.total_mujeres || 0))}
                                            </div>
                                        </td>

                                        {/* COLUMNA DE ACCIONES */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">

                                                {/* 1. Botón PDF */}
                                                <button
                                                    onClick={() => handleDescargarPDF(cap.id_capacitacion)}
                                                    disabled={descargandoId === cap.id_capacitacion}
                                                    title="Descargar PDF"
                                                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                                                >
                                                    {descargandoId === cap.id_capacitacion ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                </button>

                                                {/* 2. Botones Editar/Eliminar */}
                                                {user?.rol !== 'Auditor' && (
                                                    <>
                                                        <Link
                                                            href={`/dashboard/capacitaciones/${cap.id_capacitacion}`}
                                                            title="Editar Capacitación"
                                                            className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                                        >
                                                            <Edit size={16} />
                                                        </Link>

                                                        <button
                                                            onClick={() => openDeleteModal(cap.id_capacitacion, cap.codigo_acta)}
                                                            title="Eliminar Capacitación"
                                                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-3">
                            <FileX size={32} />
                        </div>
                        <p>No se encontraron capacitaciones.</p>
                    </div>
                )}
            </div>

            {/* MODAL ELIMINAR */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Capacitación?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Esta acción borrará permanentemente la capacitación
                                <strong className="text-gray-800"> {deleteModal.codigo} </strong>.
                            </p>
                            <div className="w-full text-left mb-4">
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                                    Escribe el código para confirmar:
                                </label>
                                <input
                                    type="text"
                                    placeholder={deleteModal.codigo}
                                    className="w-full border-2 border-red-100 focus:border-red-500 rounded-lg px-4 py-2 outline-none font-mono text-center uppercase"
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal({ show: false, id: null, codigo: '' })}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={confirmCode !== deleteModal.codigo || deleting}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg transition disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}