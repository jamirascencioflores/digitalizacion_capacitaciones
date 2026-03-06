// frontend/context/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Usuario } from '@/types';
import api from '@/services/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: Usuario | null;
    loading: boolean;
    login: (usuario: string, contrasena: string) => Promise<void>;
    logout: () => void;
    // 🟢 CORRECCIÓN 1: Usamos Partial<Usuario> en lugar de any
    actualizarUserSesion: (nuevosDatos: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: () => { },
    actualizarUserSesion: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const cargarSesion = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('token');
                // 🟢 CORRECCIÓN 2: Asegúrate de usar la misma clave siempre ('user')
                const userStored = localStorage.getItem('user');

                if (token && userStored) {
                    try {
                        setUser(JSON.parse(userStored));
                    } catch (error) {
                        console.error("Error al leer usuario", error);
                        localStorage.clear();
                    }
                }
            }
            setLoading(false);
        };
        cargarSesion();
    }, []);

    const login = async (usuario: string, contrasena: string) => {
        try {
            const { data } = await api.post('/auth/login', { usuario, contrasena });
            const { token, usuario: usuarioData } = data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(usuarioData));

            setUser(usuarioData);

            // 🟢 REDIRECCIÓN INTELIGENTE: Si necesita reset, lo mandamos a cambiar clave
            if (usuarioData.solicita_reset) {
                router.push('/change-password');
            } else {
                router.push('/dashboard');
            }

        } catch (error: unknown) {
            console.error("Error Login:", error);
            throw error;
        }
    };

    // 🟢 CORRECCIÓN 3: Implementación con tipado seguro
    const actualizarUserSesion = (nuevosDatos: Partial<Usuario>) => {
        if (!user) return;

        // Fusionamos lo que ya había con lo nuevo
        const usuarioActualizado = { ...user, ...nuevosDatos };

        // 1. Actualizamos el estado de React
        setUser(usuarioActualizado);

        // 2. Actualizamos el LocalStorage (clave 'user' para ser consistente)
        localStorage.setItem('user', JSON.stringify(usuarioActualizado));
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, actualizarUserSesion }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);