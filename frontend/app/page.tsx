import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import AboutSection from '@/components/landing/AboutSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

// página principal
export default function Home() {
  console.log('Page Rebuild Trigger');
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden transition-colors duration-300">
      {/* navegación */}
      <Navbar />

      {/* contenedor de fondo */}
      <div className="relative overflow-hidden bg-slate-50 dark:bg-gray-900/50">
        {/* patrón de fondo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>

        {/* iluminación superior */}
        <div className="absolute left-0 right-0 top-0 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px] animate-pulse"></div>

        {/* iluminación central */}
        <div className="absolute right-0 top-[40%] h-[400px] w-[400px] rounded-full bg-purple-400 opacity-10 blur-[120px]"></div>

        <Hero />

        <AboutSection />

        <div id="servicios">
          <Features />
        </div>
      </div>

      <BenefitsSection />

      {/* sección de contacto */}
      <div id="contacto" className="bg-gray-50 dark:bg-gray-900/20">
        {/* Supongo que ContactSection tiene textos persuasivos o información de la empresa */}
        <ContactSection />

        {/* Nuestro nuevo formulario envuelto para que se vea elegante */}
        <section className="pb-20 px-4">
          <div className="container mx-auto">
            <ContactSection />
          </div>
        </section>
      </div>

      {/* pie de página */}
      <Footer />
    </main>
  );
}