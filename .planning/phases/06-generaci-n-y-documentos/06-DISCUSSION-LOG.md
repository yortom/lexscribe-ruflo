# Phase 6: Generación y Documentos — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 06-generaci-n-y-documentos
**Areas discussed:** Plantillas sin .docx en MinIO, Estructura del formulario de generación, Roles no asignados en expediente (DOC-02), Variables nuevas en formulario (DOC-03)

---

## Plantillas sin .docx en MinIO

| Option | Description | Selected |
|--------|-------------|----------|
| On-the-fly en Phase 6 | GenerationService convierte `contenido` → .docx mínimo en memoria. < 50ms, no toca Phase 5, no necesita migración. | ✓ |
| Parchear Phase 5 + Phase 6 | Modificar plantillas.service.ts para guardar el .docx al crear/editar. | |

**User's choice:** On-the-fly en Phase 6
**Notes:** El usuario preguntó por el impacto de rendimiento. Respuesta: conversión < 50ms en memoria, imperceptible en el flujo de generación. La opción on-the-fly no requiere cambios en Phase 5 ni migración de datos existentes.

---

## Estructura del formulario de generación

### Organización visual

| Option | Description | Selected |
|--------|-------------|----------|
| Secciones por tipo | Una sección por tipoObjeto: Datos del expediente, Contactos por rol, Cláusulas, Fechas. | ✓ |
| Wizard paso a paso | Pantallas secuenciales por pasos. | |
| Lista plana | Todos los campos sin agrupación. | |

**User's choice:** Secciones por tipo

### Pre-relleno

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-rellena todo lo que se puede | expediente.parametros + contacto por rol si ya asignado. | ✓ |
| Solo expediente, no contactos | Solo pre-rellena variables de expediente. | |
| Sin pre-relleno | Todos los campos vacíos. | |

**User's choice:** Pre-rellena todo lo que se puede

### Nombre del documento

| Option | Description | Selected |
|--------|-------------|----------|
| Nombre de la plantilla + fecha | Auto-generado '{nombrePlantilla} - {YYYY-MM-DD}', editable. | ✓ |
| El usuario lo escribe | Campo obligatorio en el formulario. | |
| Solo nombre de la plantilla | Igual que la plantilla. | |

**User's choice:** Nombre de la plantilla + fecha

### Acceso al formulario

| Option | Description | Selected |
|--------|-------------|----------|
| Desde expediente/[id] — botón 'Nuevo documento' | Ruta existente con placeholder EXPE-07. | |
| Página propia /expedientes/[id]/documentos/nuevo | Ruta dedicada con su propio layout. | ✓ |
| Modal dentro del detalle del expediente | Full-screen modal, no cambia ruta. | |

**User's choice:** Página propia /expedientes/[id]/documentos/nuevo

---

## Roles no asignados en expediente (DOC-02)

### Resolución de rol faltante

| Option | Description | Selected |
|--------|-------------|----------|
| Selector inline en el formulario | Dropdown con contactos del expediente. | |
| Bloqueo con aviso + link a expediente | Error con link para ir a añadir el contacto. | |
| Modal para crear/asociar contacto | Modal permite buscar existente o crear nuevo básico. | ✓ |

**User's choice:** Modal para crear/asociar contacto

### Capacidades del modal

| Option | Description | Selected |
|--------|-------------|----------|
| Solo buscar y asignar existentes | Buscador de contactos del sistema. | |
| Buscar existentes + crear nuevo básico | Dos opciones: buscar existente o crear con nombre+NIF. | ✓ |

**User's choice:** Buscar existentes + crear nuevo básico

### Validación de envío

| Option | Description | Selected |
|--------|-------------|----------|
| Botón 'Generar' bloqueado hasta completar | Botón deshabilitado con contador "Faltan X campos". | ✓ |
| Validación al enviar | Validación on-submit con campos en rojo. | |

**User's choice:** Botón 'Generar' bloqueado con contador

---

## Variables nuevas en formulario (DOC-03)

### Visualización del campo nuevo

| Option | Description | Selected |
|--------|-------------|----------|
| Input inline marcado como 'campo nuevo' | Badge "nuevo" + input + mini-selector tipo. Auto-declarado al generar. | ✓ (con variación) |
| Bloqueo con aviso + link a 'Declarar variable' | Error con link a editor de plantilla. | |

**User's choice:** Input inline con badge "nuevo", auto-declarado en esquema **con aviso al usuario** de los campos creados.

### Tipo del campo nuevo

| Option | Description | Selected |
|--------|-------------|----------|
| Siempre 'texto' por defecto | tipoDato:'texto' fijo, editable luego. | |
| El usuario elige el tipo al declarar | Select (texto / número / fecha / booleano). | ✓ |

**User's choice:** El usuario elige el tipo

### Timing para elegir tipo

| Option | Description | Selected |
|--------|-------------|----------|
| Mini-selector inline junto al input del campo | Select pequeño al lado del input, sin salir del formulario. | ✓ |
| Modal separado al hacer clic en 'nuevo' | Mini-modal para configurar nombre y tipo. | |

**User's choice:** Mini-selector inline

---

## Claude's Discretion

- Estructura JSON de `datosCongelados` / contexto docxtemplater
- TTL presigned URL (5 min per ARQUITECTURA.md)
- Orden de listado de documentos en expediente
- Patrón de slugify para nombres de archivo en MinIO

## Deferred Ideas

Ninguna — la discusión se mantuvo dentro del scope de DOC-01..DOC-07.
