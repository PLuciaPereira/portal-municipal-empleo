import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Portal de Empleo | Municipalidad de Funes',
  description:
    'Plataforma pública y gratuita de intermediación laboral para vincular a vecinos y empresas de la ciudad de Funes, Santa Fe.',
  keywords: [
    'Empleo Funes',
    'Trabajo Funes',
    'Municipalidad de Funes',
    'Oficina de Empleo',
    'Ofertas laborales Santa Fe',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-brand-100 selection:text-brand-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
