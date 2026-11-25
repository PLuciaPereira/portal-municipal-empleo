import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/context/AuthContext';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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
      data-scroll-behavior="smooth"
      className={`${manrope.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        {/* Interceptor síncrono ultra-rápido: si el usuario aterriza con un token de recuperación */}
        {/* en el hash (#access_token=...&type=recovery), redirigir de inmediato a /recuperar-password/cambiar */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hash||'';var s=window.location.search||'';var p=window.location.pathname||'';if(p!=='/recuperar-password/cambiar'&&(h.indexOf('type=recovery')!==-1||(h.indexOf('access_token=')!==-1&&h.indexOf('type=signup')===-1&&h.indexOf('type=invite')===-1))){window.location.replace('/recuperar-password/cambiar'+s+h);}}catch(e){}})();`,
          }}
        />
      </head>
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