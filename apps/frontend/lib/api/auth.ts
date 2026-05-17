const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // refresh cookie
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Login failed');
  }
  return res.json() as Promise<{
    accessToken: string;
    expiresIn: number;
    user: { id: string; email: string; nombre: string };
  }>;
}

export async function logout() {
  await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function refresh() {
  const res = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ accessToken: string; expiresIn: number }>;
}
