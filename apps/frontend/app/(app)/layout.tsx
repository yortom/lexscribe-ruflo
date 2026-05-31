import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Providers } from '../providers';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth middleware (middleware.ts) already redirects to /login for missing refresh_token.
  // This server-component guard provides a defense-in-depth check.
  const cookieStore = cookies();
  const hasSession = cookieStore.has('refresh_token');
  if (!hasSession) redirect('/login');

  return (
    <Providers>
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Lexscribe</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/contactos">Contactos</a>
            <a href="/clausulas">Cláusulas</a>
            <a href="/expedientes">Expedientes</a>
          </nav>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </Providers>
  );
}
