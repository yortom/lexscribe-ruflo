# Phase 7: Calendario y Facturación - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Dos capacidades nuevas sobre el expediente:

1. **Calendario** — colección `eventos` con entradas de dos orígenes: `documento` (añadidas manualmente a un documento vía FL-8, subtipo fecha_limite/aviso/recordatorio) y `manual` (creadas directamente en el calendario). Vista de calendario unificada con filtros, control de qué eventos se muestran, color por evento, y borrado controlado cuando se elimina un documento con eventos (FL-9).
2. **Facturación** — colección `facturas` por expediente: entradas con concepto/importe/fecha/número/notas/estado, edición/eliminación, y coste total acumulado recalculado.

**Scope:** CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, FAC-01, FAC-02, FAC-03, FAC-04, FAC-05.

**No scope:**
- Cálculo automático de fechas por reglas (F-031, post-MVP).
- Visión consolidada de facturación entre expedientes (F-075, post-MVP).
- Edición/regeneración de documentos (F-080, post-MVP).
- Integraciones con calendarios externos (Out of Scope).

</domain>

<decisions>
## Implementation Decisions

### Calendario — visibilidad de eventos (CAL-03, nota del usuario)

- **D-01:** Cada evento tiene un flag de visibilidad en calendario (campo nuevo en `eventos`, p.ej. `mostrarEnCalendario: Boolean`, default a decidir por el planner — recomendado `true` para manuales y configurable al crear fechas de documento). El evento **siempre** aparece en la pestaña **Fechas** del expediente; solo los marcados como visibles aparecen en la **vista global de calendario**. Esto da control explícito al usuario sobre qué fechas "suben" al calendario — no todas las fechas del expediente se muestran.
- **⚠ Cambio de modelo de datos:** el schema `eventos` en `docs/DATOS.md §4.6` NO incluye este campo. **El planner debe añadir el campo al schema y registrar el cambio en el changelog de DATOS.md** (convención CLAUDE.md regla 4).
- El toggle de visibilidad se puede cambiar desde la pestaña Fechas del expediente y/o desde el propio evento.

### Calendario — biblioteca y estilo de vista (CAL-03, F-060)

- **D-02:** Usar **`react-calendar`** (npm) para la cuadrícula mensual + un **panel de lista** debajo que muestra los eventos del día/rango seleccionado. Renderizar marcadores (dots) en los días con eventos. Encaja con la UI minimalista Tailwind existente, bundle pequeño, esfuerzo bajo.
- Añadir `react-calendar` a `apps/frontend/package.json` (nueva dependencia — única dependencia de UI nueva del phase).
- No usar FullCalendar (overkill para MVP mono-usuario) ni construir un calendario propio desde cero.

### Calendario — ubicación y navegación (F-060, F-006, CAL-03)

- **D-03:** **Página global `/calendario`** (nueva ruta Next.js App Router bajo `(app)`) con la vista react-calendar y **filtros por expediente y rango de fechas** (CAL-03). Muestra solo eventos con `mostrarEnCalendario: true`.
- **D-04:** **Pestaña Fechas del expediente** (ya existe placeholder en `ExpedienteTabs.tsx`) muestra todas las fechas/eventos de ese expediente (auto + manuales), incluyendo los no visibles en el calendario global, con su toggle de visibilidad. Cumple F-006 (vista unificada de fechas heredadas de documentos).
- Añadir entrada "Calendario" en la navegación principal de la app.

### Calendario — añadir fechas a un documento (CAL-01, FL-8)

- **D-05:** **NO existe vista de detalle de documento** hoy (los documentos solo se listan en `DocumentosList.tsx`). FL-8 se implementa con un **modal "Añadir fecha"** lanzado desde una acción por fila en la lista de documentos. Reutiliza el patrón de modal inline establecido en Phase 6 (`RolFaltanteModal`). NO se crea una página de detalle de documento.
- **D-06:** El modal captura: fecha (fechaInicio), descripción, subtipo (`fecha_limite | aviso | recordatorio`), y el toggle `mostrarEnCalendario`. Al guardar crea un evento con `origen: "documento"`, `documentoId`, `expedienteId` (heredado del documento).
- **D-07:** Un documento puede tener **múltiples fechas** (F-033); cada una es un evento independiente (F-034). La lista de fechas de un documento se ve en la pestaña Fechas del expediente (agrupada o filtrable por documento).

### Calendario — eventos manuales (CAL-02, F-063, F-064)

- **D-08:** Botón `(+)` en la vista de calendario abre un formulario (modal) para crear evento `origen: "manual"` con: título, fechaInicio, fechaFin (opcional), descripción, tipología/subtipo, color, y `expedienteId` opcional (un evento manual puede o no estar ligado a un expediente — DATOS §4.6: `expedienteId` opcional si origen manual).

### Calendario — color de evento (CAL-04, F-065)

- **D-09:** Cada evento admite un `color` personalizable. **Claude's Discretion:** implementar como **paleta de presets** (selección de ~6-8 colores hex/token) en vez de un color-picker libre — más simple y suficiente para distinguir visualmente. Campo `color` ya existe en el schema.

### Calendario — borrado de documento con eventos (CAL-05, FL-9, F-016)

- **D-10:** Al eliminar un documento (soft-delete), si tiene eventos asociados (`eventos.documentoId`), el frontend muestra un **modal de confirmación** con dos opciones: **Conservar eventos** o **Eliminar eventos**. Reemplaza el `deleteMut` directo actual de `DocumentosList.tsx`.
- **D-11:** El endpoint de borrado de documento acepta la elección del usuario (p.ej. query/body `eventosAction: "conservar" | "eliminar"`). El backend, en el servicio de documentos, inactiva el documento y — según la elección — inactiva (soft-delete) o conserva los eventos asociados. Sigue la excepción operativa de DATOS §2.3. Sin transacciones distribuidas (DATOS §6): orden seguro + compensación.

### Facturación — interacción de la pestaña (FAC-01, FAC-02, FAC-04)

- **D-12:** Pestaña **Facturacion** del expediente (placeholder ya existe en `ExpedienteTabs.tsx`) implementada como **tabla editable inline**. "Nueva entrada" añade una fila; campos editables en la propia fila (concepto, importe, fecha [default hoy], número, notas); guardar por fila. Editar/eliminar disponibles en cualquier momento (FAC-04).

### Facturación — estado de entrada (FAC-03)

- **D-13:** Estado (`pendiente | facturado | cobrado`) se cambia con un **dropdown/badge coloreado inline en cada fila**, sin abrir el formulario de edición. Default `pendiente` al crear.

### Facturación — coste total (FAC-05, F-071)

- **D-14:** La pestaña muestra el **total general** (suma de importes de todas las entradas activas del expediente) **más un desglose por estado** (subtotales pendiente / facturado / cobrado). Recalculado automáticamente al crear/editar/eliminar. Cálculo sobre la marcha vía agregado `$sum` por `expedienteId` (DATOS §4.7), no denormalizado en `expedientes`.

### Claude's Discretion

- Default exacto de `mostrarEnCalendario` (recomendado: `true` para eventos manuales; para fechas de documento, exponer el toggle en el modal con default `true`).
- Paleta concreta de colores de eventos (D-09).
- Nombre exacto del campo de visibilidad (`mostrarEnCalendario` u otro) — registrar en DATOS.md.
- Estructura del módulo backend: `EventosModule` y `FacturacionModule` siguiendo el patrón schema + repository + service + controller + DTOs (Zod), `@Audited` en endpoints write.
- `forwardRef` si hay dependencia circular entre `DocumentosModule` y `EventosModule` (necesario para FL-9: el servicio de documentos consulta/inactiva eventos).
- Orden de compensación exacto en operaciones multi-colección (crear evento desde documento; borrar documento con eventos) — DATOS §6.
- Formato de presentación de importes (€ con 2 decimales, locale es-ES).
- Paginación/orden de entradas de facturación: por `fecha` descendente (índice DATOS §4.7).
- Agrupación/orden de eventos en la pestaña Fechas (por documento o por fecha).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Funcional — features y flujos de Phase 7
- `docs/FUNCIONAL.md` §4.5 (Módulo Calendario y Fechas: F-060..F-066) — qué hace cada feature de calendario
- `docs/FUNCIONAL.md` §4.4 (F-030, F-032, F-033, F-034) — fechas en documento que generan eventos
- `docs/FUNCIONAL.md` §4.6 (Módulo Facturación: F-070..F-075) — features de facturación (F-075 post-MVP)
- `docs/FUNCIONAL.md` FL-8 — flujo: añadir fecha a un documento y verla en el calendario
- `docs/FUNCIONAL.md` FL-9 — flujo: borrar documento con eventos asociados (conservar/eliminar)
- `docs/FUNCIONAL.md` FL-10 — flujo: registrar facturación y actualizar estado

### Datos — schemas eventos y facturas
- `docs/DATOS.md` §4.6 — schema `eventos` (campos, índices). **⚠ Requiere añadir campo de visibilidad (D-01) + registrar en changelog.**
- `docs/DATOS.md` §4.7 — schema `facturas` (campos, índices, nota sobre cálculo de total sobre la marcha)
- `docs/DATOS.md` §2.3 — soft-delete: excepción operativa de `documentos` (evaluar eventos al inactivar, FL-9)
- `docs/DATOS.md` §6 — sin transacciones distribuidas: orden seguro + compensación para operaciones multi-colección
- `docs/DATOS.md` §5 — relaciones expediente→eventos/facturas (1:N) y documento→eventos (1:N)

### Arquitectura — módulos NestJS
- `docs/ARQUITECTURA.md` — módulos NestJS por bounded context (patrón EventosModule / FacturacionModule)
- `docs/ARQUITECTURA.md` §18 — auditoría (`@Audited` en endpoints write)

### Código existente reutilizable (rutas completas)
- `apps/frontend/components/expedientes/ExpedienteTabs.tsx` — pestañas Fechas y Facturacion ya tienen placeholder ("Disponible en Phase 7") a rellenar
- `apps/frontend/components/documentos/DocumentosList.tsx` — lista de documentos; añadir acción "Añadir fecha" (FL-8) y reemplazar el delete directo por modal FL-9
- `apps/frontend/components/documentos/RolFaltanteModal.tsx` — patrón de modal inline a reutilizar
- `apps/frontend/app/(app)/expedientes/[id]/page.tsx` — página de detalle del expediente que monta ExpedienteTabs
- `apps/backend/src/modules/documentos/documentos.service.ts` — modificar borrado para FL-9 (D-11)
- `apps/backend/src/modules/documentos/` — patrón completo de módulo (schema/repository/service/controller/dto) a replicar en eventos y facturacion
- `apps/backend/src/modules/expedientes/` — integración expedienteId, validación de pertenencia
- `packages/shared-types/src/` — añadir `evento.ts` y `factura.ts` (patrón de los tipos existentes documento.ts/expediente.ts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Patrón de módulo NestJS** (`documentos/`, `expedientes/`, `clausulas/`): schema + repository + service + controller + DTOs Zod. Replicar para `EventosModule` y `FacturacionModule`.
- **`@Audited` decorator + AuditInterceptor**: usar en endpoints write de eventos y facturacion (patrón Phase 2+).
- **`softDeletePlugin` Mongoose**: aplicar a schemas `eventos` y `facturas` (campo `activo` + `fechaInactivacion`).
- **`RolFaltanteModal.tsx`**: patrón de modal inline reutilizable para el modal "Añadir fecha" (FL-8) y el modal de borrado con eventos (FL-9).
- **`ExpedienteTabs.tsx`**: tabs `fechas` y `facturacion` ya declaradas en `TabKey` y `TABS`, con placeholders — solo hay que sustituir el contenido.
- **React Query (`@tanstack/react-query`)** + **react-hook-form**: stack de datos/formularios del frontend ya establecido (queryKeys, mutations, invalidateQueries).
- **`lib/api/*` clients** (p.ej. `lib/api/documentos.ts`, `lib/api/expedientes.ts`): patrón de cliente API a replicar para `lib/api/eventos.ts` y `lib/api/facturacion.ts`.

### Established Patterns
- Módulos importados explícitamente (no `@Global`).
- `DomainError` hierarchy (`NotFoundError`, `ValidationError`, `ConflictError`) para errores de dominio.
- `forwardRef` para dependencias circulares (relevante: DocumentosModule ↔ EventosModule para FL-9).
- `usuarioId` inyectado desde JWT (AUTH-04) — nunca en body; aplica a eventos y facturas.
- Sin transacciones distribuidas — orden seguro + compensación (DATOS §6).
- Cálculo de agregados sobre la marcha (no denormalizado) — total de facturación vía `$sum`.

### Integration Points
- `ExpedienteTabs.tsx` → nuevos componentes `FechasTab` y `FacturacionTab`.
- `DocumentosList.tsx` → acción "Añadir fecha" (abre modal FL-8) + modal de borrado con eventos (FL-9).
- `documentos.service.ts` → borrado consulta/inactiva eventos según elección del usuario (D-11).
- Nueva ruta `apps/frontend/app/(app)/calendario/page.tsx` + entrada de navegación.
- `packages/shared-types` → `evento.ts`, `factura.ts`, exportados en `index.ts`.
- Backend: `EventosModule` y `FacturacionModule` registrados en el módulo raíz; importan lo necesario de Expedientes/Documentos.

</code_context>

<specifics>
## Specific Ideas

- **Toggle "mostrar en calendario" (D-01):** control explícito por evento. Pestaña Fechas del expediente = TODAS las fechas; calendario global = solo las marcadas. Campo nuevo en `eventos` → actualizar DATOS.md.
- **Vista calendario (D-02):** `react-calendar` mensual con dots en días con eventos + panel de lista del día/rango seleccionado. Filtros por expediente y rango.
- **Modal "Añadir fecha" (D-05/D-06):** desde fila de documento en `DocumentosList`. Campos: fecha, descripción, subtipo (fecha_limite/aviso/recordatorio), toggle visibilidad.
- **Modal borrado FL-9 (D-10):** "Este documento tiene N eventos asociados. ¿Conservar o eliminar los eventos?" → Conservar / Eliminar → ejecuta borrado.
- **Facturación (D-12/D-13/D-14):** tabla inline editable; dropdown de estado coloreado por fila; total general + subtotales por estado en cabecera de la pestaña.
- **Color de evento (D-09):** paleta de presets (~6-8 colores), no color-picker libre.

</specifics>

<deferred>
## Deferred Ideas

- **Cálculo automático de fechas por reglas (F-031):** post-MVP. Las fechas en Phase 7 son manuales.
- **Visión consolidada de facturación entre expedientes (F-075):** post-MVP. El índice `{ estado: 1 }` se deja previsto en DATOS §4.7 para esa vista futura.
- **Integración con calendarios externos:** Out of Scope (REQUIREMENTS.md).
- **Salida PDF de facturación / módulo contable completo:** Out of Scope — el MVP es seguimiento interno.

### Reviewed Todos (not folded)
No hay todos pendientes que encajen en Phase 7 (todo match-phase devolvió 0 coincidencias).

</deferred>

---

*Phase: 07-calendario-y-facturaci-n*
*Context gathered: 2026-06-06*
