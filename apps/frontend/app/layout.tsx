import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Lexscribe',
  description: 'Lexscribe — gestión de despacho legal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
