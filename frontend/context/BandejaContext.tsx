// frontend/context/BandejaContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuth } from './AuthContext'; // Para saber si hay alguien logueado

interface BandejaContextType {
    pendientesCount: number;
    actualizarBandeja: () => Promise<void>;
}

const BandejaContext = createContext<BandejaContextType>({
    pendientesCount: 0,
    actualizarBandeja: async () => { },
});

export const BandejaProvider = ({ children }: { children: React.ReactNode }) => {
    const [pendientesCount, setPendientesCount] = useState(0);
    const { user } = useAuth(); // Solo consultamos si el usuario está logueado

    const actualizarBandeja = async () => {
        // Solo el administrador atiende la bandeja
        if (user?.rol?.trim().toLowerCase() !== 'administrador') return;

        try {
            const response = await api.get('/contacto');
            const pendientes = response.data.filter((s: any) => s.estado === 'Pendiente').length;
            setPendientesCount(pendientes);
        } catch (error) {
            console.error("Error al consultar la bandeja en segundo plano", error);
        }
    };

    useEffect(() => {
        if (user) {
            actualizarBandeja(); // Consultar apenas entra

            // Consultar silenciosamente cada 15 segundos (15000 ms)
            const intervalo = setInterval(actualizarBandeja, 15000);

            return () => clearInterval(intervalo); // Limpiar al salir
        }
    }, [user]);

    return (
        <BandejaContext.Provider value={{ pendientesCount, actualizarBandeja }}>
            {children}
        </BandejaContext.Provider>
    );
};

export const useBandeja = () => useContext(BandejaContext);