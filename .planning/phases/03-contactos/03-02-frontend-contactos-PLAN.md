---
phase: 03-contactos
plan: 02
type: execute
wave: 2
depends_on: ["03-01"]
files_modified:
  - apps/frontend/package.json
  - apps/frontend/app/(app)/layout.tsx
  - apps/frontend/app/(app)/contactos/page.tsx
  - apps/frontend/app/(app)/contactos/nuevo/page.tsx
  - apps/frontend/app/(app)/contactos/[id]/page.tsx
  - apps/frontend/app/providers.tsx
  - apps/frontend/components/contactos/ContactoForm.tsx
  - apps/frontend/components/contactos/ContactoTable.tsx
  - apps/frontend/components/contactos/ParametrosEditor.tsx
  - apps/frontend/lib/api/contactos.ts
  - apps/frontend/__tests__/contactos/ContactoForm.test.tsx
  - apps/frontend/__tests__/contactos/ContactoTable.test.tsx
autonomous: false
requirements:
  - CONT-01
  - CONT-02
  - CONT-03
  - CONT-04
  - CONT-05

must_haves:
  truths:
    - "Existe layout `(app)/layout.tsx` con QueryClientProvider y redirect al login si no autenticado"
    - "Página `/contactos` muestra tabla paginada con columnas nombre, tipo, tipologia, documentacionFiscal; barra de búsqueda; filtro por tipologia (CONT-04)"
    - "Página `/contactos/nuevo` muestra ContactoForm; al submit válido hace POST y redirige al detalle (CONT-01, CONT-02)"
    - "Página `/contactos/[id]` muestra detalle + formulario edit + sección 'Expedientes vinculados' con estado vacío (CONT-05)"
    - "ContactoForm permite añadir parámetros personalizados (nombre + valor) que se envían en `parametros` al POST/PATCH (CONT-03)"
    - "Errores de validación Zod se muestran en la UI en inglés para el MVP; la traducción a español queda como deuda técnica documentada en SUMMARY.md (i18n pendiente)"
    - "Manual UAT: usuario crea contacto cliente con NIF, ve aparecer en listado; busca por nombre filtra; añade parámetro 'profesion' y aparece en GET /esquemas/contacto"
  artifacts:
    - path: "apps/frontend/app/(app)/layout.tsx"
      provides: "Protected layout con auth redirect + QueryClientProvider"
      contains: "QueryClientProvider"
    - path: "apps/frontend/app/(app)/contactos/page.tsx"
      provides: "Listado contactos con search + filter + paginación"
    - path: "apps/frontend/app/(app)/contactos/[id]/page.tsx"
      provides: "Detalle + edit + expedientesVinculados section"
    - path: "apps/frontend/components/contactos/ContactoForm.tsx"
      provides: "Form RHF + Zod compartido shared-validation"
      exports: ["ContactoForm"]
    - path: "apps/frontend/lib/api/contactos.ts"
      provides: "Cliente HTTP tipado contra /api/v1/contactos"
      exports: ["listContactos", "getContacto", "createContacto", "updateContacto", "deleteContacto"]
    - path: "apps/frontend/components/contactos/ParametrosEditor.tsx"
      provides: "Campo dinámico clave-valor para parámetros personalizados (CONT-03 UI)"
      contains: "ParametrosEditor"
  key_links:
    - from: "apps/frontend/components/contactos/ContactoForm.tsx"
      to: "apps/frontend/components/contactos/ParametrosEditor.tsx"
      via: "import directo — ParametrosEditor renderiza la lista de parámetros dentro del form"
      pattern: "ParametrosEditor"
    - from: "apps/frontend/components/contactos/ContactoForm.tsx"
      to: "@lexscribe/shared-validation CreateContactoSchema"
      via: "zodResolver(CreateContactoSchema)"
      pattern: "zodResolver\\(CreateContactoSchema\\)"
    - from: "apps/frontend/app/(app)/contactos/page.tsx"
      to: "/api/v1/contactos"
      via: "useQuery + listContactos en lib/api/contactos.ts"
      pattern: "useQuery"
    - from: "apps/frontend/app/(app)/layout.tsx"
      to: "QueryClientProvider"
      via: "providers.tsx wrapper client component"
      pattern: "QueryClientProvider"
---

<objective>
Construir la primera UI CRUD completa de la plataforma: listado/búsqueda/filtro de contactos, formulario crear/editar con parámetros dinámicos, detalle con sección de expedientes vinculados (stub vacío hasta Phase 4). Establece el patrón frontend que las phases 4-7 replicarán para expedientes/plantillas/etc.

Purpose: Cubrir la capa UI de CONT-01..05. Establecer infraestructura compartida de frontend (auth-aware layout, QueryClientProvider, RHF+Zod, error i18n) reusable por phases siguientes.
Output: 3 páginas de contactos funcionales, 3 componentes reutilizables, cliente HTTP tipado, layout protegido. Verificación visual via checkpoint humano.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@docs/FUNCIONAL.md
@docs/ARQUITECTURA.md
@.planning/phases/03-contactos/03-RESEARCH.md
@.planning/phases/03-contactos/03-01-backend-contactos-PLAN.md
@apps/frontend/package.json
@apps/frontend/app/layout.tsx
@apps/frontend/app/(auth)/login/page.tsx

<interfaces>
<!-- Contratos del backend (definidos por Plan 03-01) -->

API endpoints (todos requieren `Authorization: Bearer <token>` salvo /auth/*):
- GET /api/v1/contactos?search=&tipologia=&page=1&limit=20 → `{items: Contacto[], total, page, limit}`
- GET /api/v1/contactos/:id → `Contacto & {expedientesVinculados: Array<{_id, nombre, rol}>}`
- POST /api/v1/contactos → `Contacto` (201)
- PATCH /api/v1/contactos/:id → `Contacto`
- DELETE /api/v1/contactos/:id → `Contacto` (soft-deleted)

Error body shape: `{code: 'NOT_FOUND'|'VALIDATION'|'CONFLICT'|'UNAUTHORIZED', message: string}`

Tipos TS (de `@lexscribe/shared-types`):
```typescript
interface Contacto { _id, usuarioId, tipo:'fisica'|'juridica', tipologia, nombre, documentacionFiscal?, ... }
interface ContactoListResponse { items, total, page, limit }
interface ContactoDetailResponse extends Contacto { expedientesVinculados }
```

Zod schemas (de `@lexscribe/shared-validation`):
```typescript
CreateContactoSchema, UpdateContactoSchema, QueryContactoSchema, TipologiaContactoSchema, TipoPersonaSchema
```

Auth pattern existente (de `apps/frontend/app/(auth)/login/page.tsx` — leer antes):
- Token JWT se almacena en cookie `httpOnly` por backend; refresh via cookie también.
- Llamadas API requieren `credentials: 'include'` para enviar la cookie.
- Si fetch retorna 401 → redirigir a `/login`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 0 (Wave 0): Instalar dependencias frontend + setup providers + auth layout</name>
  <files>
    apps/frontend/package.json,
    apps/frontend/app/providers.tsx,
    apps/frontend/app/(app)/layout.tsx
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Pitfall 5 — QueryClientProvider, §Open Questions 1 — protected layout),
    apps/frontend/package.json (verificar dependencias existentes),
    apps/frontend/app/layout.tsx (root layout — patrón actual),
    apps/frontend/app/(auth)/login/page.tsx (patrón fetch con credentials:'include')
  </read_first>
  <action>
    1) Instalar dependencias (ejecutar desde repo root):
       ```bash
       pnpm --filter frontend add @tanstack/react-query @tanstack/react-query-devtools react-hook-form @hookform/resolvers
       ```
       Verificar que `apps/frontend/package.json` ahora contiene las 4 dependencias en `"dependencies"`.

    2) Crear `apps/frontend/app/providers.tsx` (client component que envuelve QueryClientProvider):
       ```tsx
       'use client';
       import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
       import { ReactNode, useState } from 'react';

       export function Providers({ children }: { children: ReactNode }) {
         const [client] = useState(() => new QueryClient({
           defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } }
         }));
         return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
       }
       ```

    3) Crear `apps/frontend/app/(app)/layout.tsx` (server component + client wrapper):
       ```tsx
       import { redirect } from 'next/navigation';
       import { cookies } from 'next/headers';
       import { Providers } from '../providers';

       export default function AppLayout({ children }: { children: React.ReactNode }) {
         // Verificar presencia de cookie de sesión (refresh cookie). Si no existe, redirect a login.
         const cookieStore = cookies();
         const hasSession = cookieStore.has('refresh_token') || cookieStore.has('access_token');
         if (!hasSession) redirect('/login');

         return (
           <Providers>
             <div className="min-h-screen flex flex-col">
               <header className="border-b px-6 py-4 flex items-center justify-between">
                 <h1 className="text-lg font-semibold">Lexscribe</h1>
                 <nav className="flex gap-4 text-sm">
                   <a href="/contactos">Contactos</a>
                 </nav>
               </header>
               <main className="flex-1 px-6 py-6">{children}</main>
             </div>
           </Providers>
         );
       }
       ```
       **Importante:** verificar el nombre real de la cookie de sesión leyendo el código del módulo auth backend (Plan 02-01). Si la cookie se llama distinto (p.ej. `lexscribe_refresh`), usar ese nombre. Si no se puede determinar de cookies y el patrón actual del proyecto usa otra estrategia (p.ej. localStorage token), seguir esa estrategia y documentar en SUMMARY.

    4) Si hay archivos placeholder en `apps/frontend/app/(app)/` (p.ej. el directorio no existe aún), crearlo. La existencia del grupo `(app)` está prevista en ARQUITECTURA.md §4.1 pero el RESEARCH §Open Questions 1 confirma que no estaba creado.
  </action>
  <verify>
    <automated>pnpm --filter frontend build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "@tanstack/react-query" apps/frontend/package.json` exits 0.
    - `grep -q "react-hook-form" apps/frontend/package.json` exits 0.
    - `grep -q "@hookform/resolvers" apps/frontend/package.json` exits 0.
    - `test -f apps/frontend/app/providers.tsx` exits 0.
    - `grep -q "QueryClientProvider" apps/frontend/app/providers.tsx` exits 0.
    - `grep -q "'use client'" apps/frontend/app/providers.tsx` exits 0.
    - `test -f apps/frontend/app/\(app\)/layout.tsx` exits 0 (o equivalente con bash escape correcto).
    - `grep -q "redirect" apps/frontend/app/\(app\)/layout.tsx` exits 0.
    - `grep -q "Providers" apps/frontend/app/\(app\)/layout.tsx` exits 0.
    - `pnpm --filter frontend build` exits 0 (Next.js build verde).
  </acceptance_criteria>
  <done>
    Infra frontend para rutas protegidas operativa. QueryClientProvider activo. Cualquier página dentro de `(app)/` puede usar useQuery sin error.
  </done>
</task>

<task type="auto">
  <name>Task 1: Cliente HTTP tipado + componentes reutilizables (ContactoForm, ContactoTable, ParametrosEditor)</name>
  <files>
    apps/frontend/lib/api/contactos.ts,
    apps/frontend/components/contactos/ContactoForm.tsx,
    apps/frontend/components/contactos/ContactoTable.tsx,
    apps/frontend/components/contactos/ParametrosEditor.tsx,
    apps/frontend/__tests__/contactos/ContactoForm.test.tsx,
    apps/frontend/__tests__/contactos/ContactoTable.test.tsx
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Pattern 5 — Frontend Page Structure, §Authenticated API calls pattern),
    packages/shared-validation/src/contactos.ts (Zod schemas — creados en Plan 03-01 Task 0),
    packages/shared-types/src/contacto.ts (interface Contacto — creada en Plan 03-01 Task 0),
    apps/frontend/app/(auth)/login/page.tsx (patrón fetch existente)
  </read_first>
  <action>
    1) Crear `apps/frontend/lib/api/contactos.ts`:
       ```typescript
       import type { Contacto, ContactoListResponse, ContactoDetailResponse } from '@lexscribe/shared-types';
       import type { CreateContactoInput, UpdateContactoInput, QueryContactoInput } from '@lexscribe/shared-validation';

       const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

       async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
         const res = await fetch(`${API}${path}`, {
           ...init,
           headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
           credentials: 'include',
         });
         if (!res.ok) {
           const body = await res.json().catch(() => ({}));
           throw new ApiError(body.code ?? 'UNKNOWN', body.message ?? 'API error', res.status);
         }
         return res.status === 204 ? (undefined as T) : res.json();
       }

       export class ApiError extends Error {
         constructor(public code: string, message: string, public status: number) { super(message); }
       }

       export function listContactos(query: Partial<QueryContactoInput> = {}): Promise<ContactoListResponse> {
         const params = new URLSearchParams();
         if (query.search) params.set('search', query.search);
         if (query.tipologia) params.set('tipologia', query.tipologia);
         params.set('page', String(query.page ?? 1));
         params.set('limit', String(query.limit ?? 20));
         return apiFetch<ContactoListResponse>(`/contactos?${params.toString()}`);
       }
       export function getContacto(id: string): Promise<ContactoDetailResponse> {
         return apiFetch<ContactoDetailResponse>(`/contactos/${id}`);
       }
       export function createContacto(data: CreateContactoInput): Promise<Contacto> {
         return apiFetch<Contacto>('/contactos', { method: 'POST', body: JSON.stringify(data) });
       }
       export function updateContacto(id: string, data: UpdateContactoInput): Promise<Contacto> {
         return apiFetch<Contacto>(`/contactos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
       }
       export function deleteContacto(id: string): Promise<void> {
         return apiFetch<void>(`/contactos/${id}`, { method: 'DELETE' });
       }
       ```

    2) Crear `apps/frontend/components/contactos/ParametrosEditor.tsx`:
       Componente con array de `{nombre, valor}`. Botón "+ Añadir parámetro" añade fila. Botón "x" elimina. Inputs validan que `nombre` matchee `/^[a-zA-Z][a-zA-Z0-9_]*$/` (mostrar error inline si no).
       Props: `value: Record<string, unknown>`, `onChange: (next: Record<string, unknown>) => void`.
       Implementación con `useState` interno para las filas y `useEffect` que sincroniza al `onChange`.

    3) Crear `apps/frontend/components/contactos/ContactoForm.tsx`:
       ```tsx
       'use client';
       import { useForm } from 'react-hook-form';
       import { zodResolver } from '@hookform/resolvers/zod';
       import { CreateContactoSchema, type CreateContactoInput } from '@lexscribe/shared-validation';
       import { ParametrosEditor } from './ParametrosEditor';

       export function ContactoForm({ initial, onSubmit, submitLabel = 'Guardar' }: {
         initial?: Partial<CreateContactoInput>;
         onSubmit: (data: CreateContactoInput) => Promise<void> | void;
         submitLabel?: string;
       }) {
         const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<CreateContactoInput>({
           resolver: zodResolver(CreateContactoSchema),
           defaultValues: { tipo: 'fisica', tipologia: 'cliente', nombre: '', parametros: {}, ...initial },
         });
         const parametros = watch('parametros') ?? {};
         return (
           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
             <fieldset className="grid grid-cols-2 gap-4">
               <label>Tipo
                 <select {...register('tipo')} className="...">
                   <option value="fisica">Persona física</option>
                   <option value="juridica">Persona jurídica</option>
                 </select>
               </label>
               <label>Tipología
                 <select {...register('tipologia')}>
                   <option value="cliente">Cliente</option>
                   <option value="parte_contraria">Parte contraria</option>
                   <option value="interesado">Interesado</option>
                   <option value="otros">Otros</option>
                 </select>
               </label>
             </fieldset>
             <label>Nombre / Razón social
               <input {...register('nombre')} />
               {errors.nombre && <span className="text-red-600 text-sm">{errors.nombre.message}</span>}
             </label>
             <fieldset className="grid grid-cols-2 gap-4">
               <label>NIF/CIF<input {...register('documentacionFiscal')} /></label>
               <label>DNI/NIE<input {...register('documentoIdentidad')} /></label>
               <label>Email<input type="email" {...register('email')} /></label>
               <label>Teléfono<input {...register('telefono')} /></label>
               <label className="col-span-2">Dirección<input {...register('direccion')} /></label>
             </fieldset>
             <section>
               <h3>Parámetros personalizados</h3>
               <ParametrosEditor value={parametros} onChange={(next) => setValue('parametros', next)} />
             </section>
             <button type="submit" disabled={isSubmitting}>{submitLabel}</button>
           </form>
         );
       }
       ```
       Estilos Tailwind concretos pueden simplificarse — la prioridad es funcionalidad correcta.

    4) Crear `apps/frontend/components/contactos/ContactoTable.tsx`:
       Props: `items: Contacto[]`, `total: number`, `page: number`, `limit: number`, `onPageChange`, `onSearch(q: string)`, `onTipologiaChange(t: string|null)`.
       Renderiza:
       - Toolbar: input de búsqueda con debounce 300ms (`useDebouncedValue`) → llama `onSearch`. Select de tipología (incluye opción "Todas" → null).
       - Tabla con columnas: Nombre, Tipo, Tipología, Documentación fiscal, Email. Click en fila → navega a `/contactos/[id]`.
       - Paginación: botones "Anterior" / "Siguiente" + texto "Página X de Y" (Y = `Math.ceil(total/limit)`).

    5) Tests Vitest:
       - `__tests__/contactos/ContactoForm.test.tsx`: renderiza el form, rellena nombre+tipo+tipologia, hace submit, verifica que `onSubmit` recibió el payload esperado. Test 2: submit con nombre vacío → error de validación visible (Zod).
       - `__tests__/contactos/ContactoTable.test.tsx`: renderiza con 3 items mock, asserta 3 filas. Cambia búsqueda → llama `onSearch` con el valor tras debounce.

    Nota i18n: los `errors.X.message` vienen de Zod en inglés. Para el MVP, dejar los mensajes inline en inglés (acción: documentar en SUMMARY como "i18n pendiente: futura iteración mappeará Zod errors a español"). NO bloquear el plan en esto.
  </action>
  <verify>
    <automated>pnpm --filter frontend test -- contactos</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/frontend/lib/api/contactos.ts` exits 0.
    - `grep -q "credentials: 'include'" apps/frontend/lib/api/contactos.ts` exits 0.
    - `grep -q "export function listContactos" apps/frontend/lib/api/contactos.ts` exits 0.
    - `grep -q "export function createContacto" apps/frontend/lib/api/contactos.ts` exits 0.
    - `grep -q "export class ApiError" apps/frontend/lib/api/contactos.ts` exits 0.
    - `grep -q "zodResolver(CreateContactoSchema)" apps/frontend/components/contactos/ContactoForm.tsx` exits 0.
    - `grep -q "ParametrosEditor" apps/frontend/components/contactos/ContactoForm.tsx` exits 0.
    - `grep -q "useForm" apps/frontend/components/contactos/ContactoForm.tsx` exits 0.
    - `grep -q "tipologia" apps/frontend/components/contactos/ContactoTable.tsx` exits 0.
    - `grep -q "onSearch" apps/frontend/components/contactos/ContactoTable.tsx` exits 0.
    - `pnpm --filter frontend test -- contactos` shows 4+ passing tests, 0 failures.
  </acceptance_criteria>
  <done>
    Cliente API tipado + 3 componentes reusables. Tests verdes en Vitest.
  </done>
</task>

<task type="auto">
  <name>Task 2: Páginas de contactos (listado, nuevo, detalle/edit)</name>
  <files>
    apps/frontend/app/(app)/contactos/page.tsx,
    apps/frontend/app/(app)/contactos/nuevo/page.tsx,
    apps/frontend/app/(app)/contactos/[id]/page.tsx
  </files>
  <read_first>
    .planning/phases/03-contactos/03-RESEARCH.md (§Pattern 5 — Frontend Page Structure),
    apps/frontend/components/contactos/ContactoForm.tsx (creado en Task 1),
    apps/frontend/components/contactos/ContactoTable.tsx (creado en Task 1),
    apps/frontend/lib/api/contactos.ts (creado en Task 1)
  </read_first>
  <action>
    1) `apps/frontend/app/(app)/contactos/page.tsx` (client component):
       ```tsx
       'use client';
       import { useQuery } from '@tanstack/react-query';
       import { useState } from 'react';
       import Link from 'next/link';
       import { listContactos } from '@/lib/api/contactos';
       import { ContactoTable } from '@/components/contactos/ContactoTable';

       export default function ContactosPage() {
         const [search, setSearch] = useState('');
         const [tipologia, setTipologia] = useState<string | null>(null);
         const [page, setPage] = useState(1);
         const limit = 20;
         const { data, isLoading, error } = useQuery({
           queryKey: ['contactos', { search, tipologia, page, limit }],
           queryFn: () => listContactos({ search: search || undefined, tipologia: tipologia ?? undefined, page, limit }),
         });
         return (
           <div className="space-y-4">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-semibold">Contactos</h2>
               <Link href="/contactos/nuevo" className="px-4 py-2 bg-blue-600 text-white rounded">Nuevo contacto</Link>
             </div>
             {isLoading && <p>Cargando...</p>}
             {error && <p className="text-red-600">Error: {(error as Error).message}</p>}
             {data && (
               <ContactoTable
                 items={data.items} total={data.total} page={page} limit={limit}
                 onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }}
                 onTipologiaChange={(t) => { setTipologia(t); setPage(1); }}
               />
             )}
           </div>
         );
       }
       ```

    2) `apps/frontend/app/(app)/contactos/nuevo/page.tsx`:
       ```tsx
       'use client';
       import { useRouter } from 'next/navigation';
       import { useMutation } from '@tanstack/react-query';
       import { ContactoForm } from '@/components/contactos/ContactoForm';
       import { createContacto } from '@/lib/api/contactos';

       export default function NuevoContactoPage() {
         const router = useRouter();
         const mutation = useMutation({
           mutationFn: createContacto,
           onSuccess: (contacto) => router.push(`/contactos/${contacto._id}`),
         });
         return (
           <div className="space-y-4">
             <h2 className="text-2xl font-semibold">Nuevo contacto</h2>
             {mutation.error && <p className="text-red-600">Error: {(mutation.error as Error).message}</p>}
             <ContactoForm onSubmit={(data) => mutation.mutateAsync(data)} submitLabel="Crear contacto" />
           </div>
         );
       }
       ```

    3) `apps/frontend/app/(app)/contactos/[id]/page.tsx`:
       ```tsx
       'use client';
       import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
       import { useRouter } from 'next/navigation';
       import { use } from 'react';
       import { ContactoForm } from '@/components/contactos/ContactoForm';
       import { getContacto, updateContacto, deleteContacto } from '@/lib/api/contactos';

       export default function ContactoDetailPage({ params }: { params: Promise<{ id: string }> }) {
         const { id } = use(params);
         const router = useRouter();
         const qc = useQueryClient();
         const { data, isLoading } = useQuery({ queryKey: ['contacto', id], queryFn: () => getContacto(id) });
         const updateMut = useMutation({
           mutationFn: (input: Parameters<typeof updateContacto>[1]) => updateContacto(id, input),
           onSuccess: () => qc.invalidateQueries({ queryKey: ['contacto', id] }),
         });
         const deleteMut = useMutation({
           mutationFn: () => deleteContacto(id),
           onSuccess: () => router.push('/contactos'),
         });
         if (isLoading) return <p>Cargando...</p>;
         if (!data) return <p>No encontrado</p>;
         return (
           <div className="space-y-6">
             <header className="flex justify-between items-center">
               <h2 className="text-2xl font-semibold">{data.nombre}</h2>
               <button
                 onClick={() => { if (confirm('¿Eliminar contacto?')) deleteMut.mutate(); }}
                 className="text-red-600"
               >Eliminar</button>
             </header>
             <ContactoForm
               initial={data}
               onSubmit={(input) => updateMut.mutateAsync(input)}
               submitLabel="Guardar cambios"
             />
             <section className="border-t pt-4">
               <h3 className="text-lg font-semibold mb-2">Expedientes vinculados</h3>
               {data.expedientesVinculados.length === 0 ? (
                 <p className="text-sm text-gray-500">Este contacto no aparece en ningún expediente todavía. (Disponible cuando se implementen expedientes en Phase 4.)</p>
               ) : (
                 <ul>
                   {data.expedientesVinculados.map(e => <li key={e._id}>{e.nombre} — {e.rol}</li>)}
                 </ul>
               )}
             </section>
           </div>
         );
       }
       ```
       **Nota Next.js 14 vs 15:** si el proyecto está en Next 15+, `params` es una Promise. Si está en Next 14, es síncrono. Verificar `apps/frontend/package.json` y ajustar (`const { id } = params` vs `const { id } = use(params)`). El default arriba asume 15+ siguiendo el pattern oficial. Documentar la versión usada.
  </action>
  <verify>
    <automated>pnpm --filter frontend build &amp;&amp; pnpm --filter frontend test</automated>
  </verify>
  <acceptance_criteria>
    - `test -f "apps/frontend/app/(app)/contactos/page.tsx"` exits 0.
    - `test -f "apps/frontend/app/(app)/contactos/nuevo/page.tsx"` exits 0.
    - `test -f "apps/frontend/app/(app)/contactos/[id]/page.tsx"` exits 0.
    - `grep -q "useQuery" "apps/frontend/app/(app)/contactos/page.tsx"` exits 0.
    - `grep -q "useMutation" "apps/frontend/app/(app)/contactos/nuevo/page.tsx"` exits 0.
    - `grep -q "expedientesVinculados" "apps/frontend/app/(app)/contactos/[id]/page.tsx"` exits 0.
    - `grep -q "Expedientes vinculados" "apps/frontend/app/(app)/contactos/[id]/page.tsx"` exits 0 (texto en español).
    - `grep -q "Phase 4" "apps/frontend/app/(app)/contactos/[id]/page.tsx"` exits 0 (mensaje stub explícito).
    - `grep -q "deleteContacto" "apps/frontend/app/(app)/contactos/[id]/page.tsx"` exits 0.
    - `pnpm --filter frontend build` exits 0 (Next.js compila sin errores TS).
    - `pnpm --filter frontend test` exits 0 (Vitest verde).
  </acceptance_criteria>
  <done>
    3 páginas funcionales conectadas al backend. CRUD completo desde la UI.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificación visual + UAT manual de los 4 escenarios CONT-XX</name>
  <what-built>
    UI completa de contactos: listado con búsqueda y filtro, formulario crear/editar con parámetros dinámicos, detalle con sección "Expedientes vinculados" stub.
    Backend operativo desde Plan 03-01 (CONT-01..05 verificados via e2e).
  </what-built>
  <how-to-verify>
    Pre-requisitos:
    1. `pnpm seed` ejecutado (usuario default existe).
    2. `docker compose up` o `pnpm dev` levantando frontend (3000) + backend (3001) + Mongo.
    3. Login con SEED_USER_EMAIL / SEED_USER_PASSWORD vía http://localhost:3000/login.

    Escenarios manuales (cada uno marca un CONT-XX):

    **Escenario 1 — CONT-01 + CONT-02 (crear contacto):**
    1. Navegar a http://localhost:3000/contactos.
    2. Click "Nuevo contacto".
    3. Rellenar: tipo=Persona física, tipología=Cliente, nombre="Ana López", NIF="12345678A", email="ana@test.es".
    4. Click "Crear contacto".
    5. Verificar redirect a `/contactos/<id>` y que muestra "Ana López" en el header.
    6. Volver a `/contactos` → "Ana López" aparece en la tabla con columnas correctas.

    **Escenario 2 — CONT-03 (parámetro dinámico):**
    1. En el detalle de Ana, ir a "Parámetros personalizados".
    2. Click "+ Añadir parámetro", introducir nombre=`profesion`, valor=`Abogada`.
    3. Click "Guardar cambios".
    4. Verificar que aparece "Saved" / sin error.
    5. (Opcional avanzado) Vía DevTools o curl autenticado: `GET /api/v1/esquemas/contacto` debe contener `parametros: [{nombre:'profesion', tipoDato:'texto', ...}]`.

    **Escenario 3 — CONT-04 (búsqueda + filtro + paginación):**
    1. Crear ≥3 contactos: 2 con tipologia "cliente", 1 con "parte_contraria".
    2. En `/contactos`, escribir "Ana" en barra de búsqueda → solo aparecen los que matchean.
    3. Cambiar filtro a "parte_contraria" → solo aparece el contacto correspondiente.
    4. Si hay >20 contactos seedeados, verificar paginación (botones Anterior/Siguiente).

    **Escenario 4 — CONT-05 (expedientes vinculados stub):**
    1. Abrir detalle de cualquier contacto.
    2. Verificar que la sección "Expedientes vinculados" existe.
    3. Verificar que muestra el texto explicativo "Este contacto no aparece en ningún expediente todavía. (Disponible cuando se implementen expedientes en Phase 4.)".

    **Escenario 5 — Soft-delete:**
    1. Click "Eliminar" en detalle, confirmar el `confirm`.
    2. Redirige a `/contactos`, el contacto NO aparece en el listado.
    3. (Opcional) Verificar en Mongo: documento existe pero `activo:false`.

    Reportar problemas si: cualquier paso no funciona, error 500/401, render visualmente roto, validation no aparece, stub de expedientes no se ve.
  </how-to-verify>
  <resume-signal>Type "approved" si los 5 escenarios pasan. Si hay problemas, describir cuál falla y volver a Task 2 para corregir.</resume-signal>
</task>

</tasks>

<verification>
1. `pnpm --filter frontend build` exitoso.
2. `pnpm --filter frontend test` verde.
3. Checkpoint humano (Task 3) aprobado: 5 escenarios manuales pasan.
4. Lint frontend (`pnpm --filter frontend lint`) verde.
</verification>

<success_criteria>
- CONT-01: Form crear contacto persona física/jurídica funciona end-to-end (UAT).
- CONT-02: Tipologia seleccionable, validación bloquea submit con tipologia ausente (UAT).
- CONT-03: ParametrosEditor permite añadir nombre+valor; al guardar, se registra en esquema dinámico (UAT).
- CONT-04: Tabla con búsqueda + filtro + paginación operativa (UAT).
- CONT-05: Sección "Expedientes vinculados" presente con estado vacío explícito + nota Phase 4 (UAT).
- Auth-aware: layout redirige a /login si no hay sesión.
- Tests Vitest verdes para componentes ContactoForm + ContactoTable.
</success_criteria>

<output>
After completion, create `.planning/phases/03-contactos/03-02-SUMMARY.md` documentando:
- Versiones instaladas de @tanstack/react-query, react-hook-form, @hookform/resolvers.
- Decisión sobre auth (cookie name detectada / strategy usada).
- Decisión sobre Next.js version (14 vs 15) y patrón de params usado.
- i18n pendiente: Zod errors siguen en inglés en UI; futura iteración mappeará a español (registrar como deuda).
- Resultados del UAT (5 escenarios) y cualquier hallazgo del checkpoint.
</output>
