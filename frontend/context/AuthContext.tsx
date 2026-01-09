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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    logout: () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // 1. Cargar sesión desde localStorage al iniciar
        const cargarSesion = () => {
            // Verificamos que estemos en el navegador antes de acceder a localStorage
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
            // 2. LLAMADA A LA RUTA CORRECTA
            const { data } = await api.post('/auth/login', { usuario, password: contrasena });

            // 3. RECIBIMOS EL TOKEN Y EL USUARIO
            const { token, user: usuarioData } = data;

            // 4. GUARDAMOS EN LOCALSTORAGE
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(usuarioData));

            // 5. ACTUALIZAMOS ESTADO Y REDIRIGIMOS
            setUser(usuarioData);
            router.push('/dashboard');

        } catch (error: unknown) { // <--- CORRECCIÓN: Usamos 'unknown' en lugar de 'any'
            console.error("Error Login:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);