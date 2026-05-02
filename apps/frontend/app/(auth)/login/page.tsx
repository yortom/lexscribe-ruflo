'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginSchema } from '@lexscribe/shared-validation';
import { login } from '../../../lib/api/auth';
import { session } from '../../../lib/auth/session';

const ERROR_MESSAGES: Record<string, string> = {
  email: 'Introduce un correo electrónico válido.',
  password: 'La contraseña debe tener entre 8 y 128 caracteres.',
  credentials: 'Credenciales inválidas.',
  unknown: 'Error al iniciar sesión. Inténtalo de nuevo.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate with LoginSchema
    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      if (firstIssue.path[0] === 'email') {
        setError(ERROR_MESSAGES.email);
      } else {
        setError(ERROR_MESSAGES.password);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      session.set(res.accessToken);
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Invalid credentials') {
        setError(ERROR_MESSAGES.credentials);
      } else {
        setError(ERROR_MESSAGES.unknown);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Lexscribe</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  );
}
