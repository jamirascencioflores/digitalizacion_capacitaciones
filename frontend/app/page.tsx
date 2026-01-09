// frontend/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir automáticamente al login apenas entran a la web
  redirect('/login');
}