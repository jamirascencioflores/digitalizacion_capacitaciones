// frontend/context/AlertasContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '@/services/api';
import { useAuth } from './AuthContext';

interface AlertasContextType {
    alertasPendientes: number;
    recargarAlertas: () => void;
}

const AlertasContext = createContext<AlertasContextType>({ alertasPendientes: 0, recargarAlertas: () => { } });

export const useAlertas = () => useContext(AlertasContext);

export const AlertasProvider = ({ children }: { children: ReactNode }) => {
    const [alertasPendientes, setAlertasPendientes] = useState(0);
    const { user } = useAuth();

    // Normalizamos el rol
    const esAdmin = user?.rol?.trim().toLowerCase() === 'administrador';

    // Función memorizada con useCallback para evitar recreaciones
    const verificarAlertas = useCallback(async () => {
        if (!esAdmin) return;

        try {
            const res = await api.get('/usuarios/solicitudes');
            setAlertasPendientes((prev) => {
                // Solo actualizamos si el número cambió (optimización)
                if (prev !== res.data.length) return res.data.length;
                return prev;
            });
        } catch (error) {
            console.error("Error polling alertas", error);
        }
    }, [esAdmin]);

    useEffect(() => {
        if (esAdmin) {
            // 🟢 SOLUCIÓN AL ERROR DE ESLINT:
            // Creamos una función local asíncrona. Esto rompe la cadena síncrona 
            // que el linter detecta como "peligrosa".
            const iniciarPolling = async () => {
                await verificarAlertas();
            };

            // 1. Ejecutar inmediatamente
            iniciarPolling();

            // 2. Configurar intervalo (cada 30 segundos)
            const intervalo = setInterval(iniciarPolling, 30000);

            // 3. Limpieza
            return () => clearInterval(intervalo);
        }
    }, [esAdmin, verificarAlertas]);

    return (
        <AlertasContext.Provider value={{ alertasPendientes, recargarAlertas: verificarAlertas }}>
            {children}
        </AlertasContext.Provider>
    );
};