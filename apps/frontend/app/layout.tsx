import type { Metadata, ReactNode } from 'next';

export const metadata: Metadata = {
  title: 'Lexscribe',
  description: 'Automatización de contratos legales',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
