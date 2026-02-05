import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, FileText, Lock, Shield, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800 selection:bg-blue-100">

      {/* 🟢 NAVBAR SIMPLIFICADO */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              {/* CORRECCIÓN: bg-linear-to-tr */}
              <div className="bg-linear-to-tr from-blue-600 to-blue-400 p-1.5 rounded-lg shadow-lg shadow-blue-500/30">
                <Shield className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">FORMAPP</span>
            </div>

            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white transition-all duration-200 bg-slate-900 rounded-full hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
            >
              <span>Iniciar Sesión</span>
              <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
            </Link>
          </div>
        </div>
      </nav>

      {/* 🟢 HERO SECTION CON GRADIENTES Y MOCKUP */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl z-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
          <div className="absolute top-20 right-10 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wide mb-8 hover:bg-white hover:border-blue-200 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Tecnología desarrollada por Nós Planét
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
            Gestión de Seguridad <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">SST</span> <br className="hidden sm:block" />
            Inteligente y Sin Papel.
          </h1>

          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            La plataforma definitiva para registrar capacitaciones, validar asistencia biométrica y asegurar el cumplimiento normativo en segundos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/login"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-xl shadow-blue-600/20 hover:-translate-y-1"
            >
              Acceder a la Plataforma <ArrowRight size={20} />
            </Link>
          </div>

          {/* 🖼️ MOCKUP / SCREENSHOT DEL SISTEMA */}
          <div className="relative mx-auto max-w-5xl mt-12">
            {/* Borde decorativo exterior */}
            <div className="rounded-xl bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 lg:rounded-2xl lg:p-4">
              <div className="rounded-md bg-white shadow-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-200">
                <Image
                  src="/dashboard-screenshot.png" // Asegúrate que el nombre coincida
                  alt="Dashboard FORMAPP"
                  fill
                  className="object-contain bg-slate-50"
                />
              </div>
            </div>
          </div>

        </div>
      </header>


      {/* 🟢 PRUEBA SOCIAL / TRUST STRIP */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Confían en nuestra tecnología para proteger a sus trabajadores
          </p>
          <div className="flex justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Aquí pon el logo de Pampa Baja */}
            <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-full"></div>
              AGRICOLA PAMPA BAJA
            </div>
          </div>
        </div>
      </section>


      {/* 🟢 FEATURES CON DISEÑO DE TARJETAS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Todo lo que necesitas para auditorías exitosas</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Diseñado específicamente para cumplir con la normativa de SST y facilitar la vida de los prevencionistas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Smartphone size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Firma Biométrica Digital</h3>
              <p className="text-slate-500 leading-relaxed">
                Captura la firma de los trabajadores directamente en pantalla (celular o tablet). Reemplaza el papel y valida la identidad al instante.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-green-100 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Reportes Excel Auditables</h3>
              <p className="text-slate-500 leading-relaxed">
                Olvídate de transcribir. Genera reportes con logos, asistencia y cálculo automático de indicadores de cumplimiento (KPIs).
              </p>
            </div>

            {/* Feature 3: CORREGIDO (Usamos Lock aquí para aprovechar el import) */}
            <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-100 hover:shadow-xl hover:shadow-purple-900/5 transition-all duration-300">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Lock size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Evidencias Inmutables</h3>
              <p className="text-slate-500 leading-relaxed">
                Cada capacitación se respalda con fotos y firmas almacenadas en la nube de alta seguridad. Tus datos, siempre disponibles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 NUEVA SECCIÓN: SOBRE NÓS PLANÉT (AUTORIDAD TÉCNICA) */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        {/* Decoración de fondo CORREGIDO bg-linear-to-l */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-blue-900/20 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="inline-block px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                Innovación Tecnológica
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Respaldado por la ingeniería de <span className="text-blue-400">Nós Planét</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                FORMAPP no es solo un software; es el resultado de años de experiencia en desarrollo de soluciones digitales para la industria.
                En Nós Planét, transformamos procesos complejos en herramientas intuitivas.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="text-blue-500" /> Infraestructura Cloud de Alta Disponibilidad
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="text-blue-500" /> Seguridad de Datos Bancaria
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="text-blue-500" /> Soporte Técnico Especializado
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 flex justify-center">
              {/* Círculo de fondo con efecto de cristal */}
              <div className="relative w-72 h-40 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl shadow-blue-900/20 px-6">

                {/* Contenedor de la imagen */}
                <div className="relative w-full h-full">
                  <Image
                    src="/nos_planet.png"
                    alt="Nós Planét Logo"
                    fill
                    // 🔴 CAMBIO: Quité 'brightness-0 invert'. 
                    // Ahora solo tiene 'object-contain' para que no se recorte.
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 FOOTER COMPACTO */}
      <footer className="w-full py-8 bg-slate-950 border-t border-slate-900 text-center">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} FORMAPP. Un producto de <span className="text-slate-400 font-semibold hover:text-white transition-colors cursor-pointer">Nós Planét</span>.
        </p>
      </footer>
    </div>
  );
}