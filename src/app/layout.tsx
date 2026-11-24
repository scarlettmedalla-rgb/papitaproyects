import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuctionProvider } from '@/context/AuctionContext';

export const metadata: Metadata = {
  title: 'AlToque — Subastas Inversas Locales',
  description:
    'Publica lo que necesitas y deja que comercios y técnicos locales compitan en vivo con mejores precios y Cartas de Beneficio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AlToque',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF9F6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#FAF9F6] text-[#2E1065] antialiased selection:bg-[#F3E8FF] selection:text-[#6D28D9]">
        <AuctionProvider>{children}</AuctionProvider>
      </body>
    </html>
  );
}
