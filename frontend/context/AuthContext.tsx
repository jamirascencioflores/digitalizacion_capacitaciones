'use client';
import { createContext, useContext, useEffect, useState } from 'react';

import { Usuario } from '@/types';
import api from '@/services/api';
import { useRouter, usePathname } from 'next/navigation';
import SplashScreen from '@/components/shared/SplashScreen';



interface AuthContextType {
    user: Usuario | null;
    loading: boolean;
    isNavigating: boolean;
    setIsNavigating: (val: boolean) => void;
    login: (usuario: string, contrasena: string) => Promise<void>;
    logout: () => void;
    actualizarUserSesion: (nuevosDatos: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isNavigating: false,
    setIsNavigating: () => { },
    login: async () => { },
    logout: () => { },
    actualizarUserSesion: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [navMessage, setNavMessage] = useState('Preparando tu sesión...');
    const router = useRouter();
    const pathname = usePathname();

    // 🟢 RESETEAR NAVEGACIÓN CUANDO CAMBIA LA RUTA
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname]);

    useEffect(() => {
        const cargarSesion = () => {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('token');
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
            setNavMessage('Entrando al sistema...');
            setIsNavigating(true);

            setTimeout(() => {
                if (usuarioData.solicita_reset) {
                    router.push('/change-password');
                } else {
                    router.push('/dashboard');
                }
            }, 800);

        } catch (error: unknown) {
            console.error("Error Login:", error);
            throw error;
        }
    };

    const logout = () => {
        setNavMessage('Cerrando sesión...');
        setIsNavigating(true);
        setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            window.location.href = '/login';
        }, 1200);
    };

    const actualizarUserSesion = (nuevosDatos: Partial<Usuario>) => {
        if (!user) return;
        const usuarioActualizado = { ...user, ...nuevosDatos };
        setUser(usuarioActualizado);
        localStorage.setItem('user', JSON.stringify(usuarioActualizado));
    };

    return (
        <AuthContext.Provider value={{ user, loading, isNavigating, setIsNavigating, login, logout, actualizarUserSesion }}>
            {isNavigating && <SplashScreen message={navMessage} />}
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => useContext(AuthContext);