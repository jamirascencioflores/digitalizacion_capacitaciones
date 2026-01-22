// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AlertasProvider } from '@/context/AlertasContext'; // Importamos

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema SST Digital",
  description: "Digitalización de Capacitaciones",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>

        {/* 🟢 CORRECCIÓN: Un Provider dentro del otro */}
        <AuthProvider>
          <AlertasProvider>
            {children}
          </AlertasProvider>
        </AuthProvider>

      </body>
    </html>
  );
}