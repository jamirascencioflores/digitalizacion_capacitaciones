// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // ✅ 1. IMPORTAR ESTO

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

        {/* ✅ 2. RODEAMOS EL CHILDREN CON EL PROVIDER */}
        <AuthProvider>
          {children}
        </AuthProvider>

      </body>
    </html>
  );
}