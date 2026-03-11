// frontend/context/AlertasContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from './AuthContext';

interface AlertasContextType {
    alertasPendientes: number;
    recargarAlertas: () => Promise<void>;
}

const AlertasContext = createContext<AlertasContextType>({
    alertasPendientes: 0,
    recargarAlertas: async () => { },
});

export const AlertasProvider = ({ children }: { children: React.ReactNode }) => {
    const [alertasPendientes, setAlertasPendientes] = useState(0);
    const { user } = useAuth();

    const recargarAlertas = async () => {
        // Solo el administrador procesa las alertas de usuarios
        if (user?.rol?.trim().toLowerCase() !== 'administrador') return;

        try {
            const response = await api.get('/usuarios/solicitudes');
            setAlertasPendientes(response.data.length);
        } catch (error) {
            console.error("Error al consultar las alertas en segundo plano", error);
        }
    };

    useEffect(() => {
        // Si hay un usuario logueado, activamos el radar
        if (user) {
            recargarAlertas(); // 1. Consultar apenas entra

            // 2. Consultar silenciosamente cada 30 segundos
            const intervalo = setInterval(recargarAlertas, 30000);

            // 3. Apagar el radar si cierra sesión
            return () => clearInterval(intervalo);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    return (
        <AlertasContext.Provider value={{ alertasPendientes, recargarAlertas }}>
            {children}
        </AlertasContext.Provider>
    );
};

export const useAlertas = () => useContext(AlertasContext);