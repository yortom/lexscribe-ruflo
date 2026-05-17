# Lexscribe — Modelo de Datos

> Documento técnico. Describe **cómo** se persisten los conceptos definidos en [`FUNCIONAL.md`](FUNCIONAL.md).
> Cada colección/atributo se referencia a las features `F-XXX` que lo justifican.

---

## 1. Alcance y stack

- **Base de datos principal:** MongoDB (documental).
- **Storage de archivos:** servicio de almacenamiento de objetos (S3-compatible o equivalente). Guarda los binarios de plantillas originales, documentos generados y documentos subidos.
- **Identificadores:** `ObjectId` nativo de MongoDB en todas las colecciones (`_id`).
- **Fechas:** `ISODate` UTC en MongoDB, presentación en zona local (`Europe/Madrid`).
- **Idioma de los datos:** español. Nombres de campos en español + camelCase para mantener consistencia con la sintaxis de variables (`{{contacto.nombreCliente}}`).

> **Trazabilidad:** cada colección y cada campo importante incluye una columna o nota con la(s) feature(s) que lo justifica(n). Si una feature cambia, se actualiza el modelo y se registra en el changelog.

---

## 2. Convenciones

1. **Nombres de colección** en plural y minúsculas: `expedientes`, `contactos`, `plantillas`…
2. **Nombres de campo** en camelCase (`fechaCreacion`, `nombreCliente`).
3. **Soft delete universal:**
   - Toda colección de negocio incluye los campos `activo: Boolean` (default `true`) y `fechaInactivacion: ISODate | null`.
   - "Borrar" desde la UI = `activo = false`. El registro se mantiene en la base de datos.
   - Las consultas por defecto filtran por `activo: true`. Los listados muestran solo registros activos.
   - Excepción operativa: `documentos` — al inactivarse se evalúan eventos asociados (F-016, FL-9). Si el usuario opta por eliminar los eventos, éstos también se inactivan.
4. **Snapshots:** los documentos generados guardan una copia inmutable (`datosCongelados`) del JSON usado en la generación (F-015).
5. **Auditoría mínima:** todos los registros incluyen `fechaCreacion`, `fechaActualizacion` y `usuarioId` (propietario). Aunque el MVP sea mono-usuario, se persiste `usuarioId` para no tener que migrar el esquema cuando se introduzca multi-usuario.
6. **Sin transacciones distribuidas:** cuando una operación afecta a varias colecciones (ej. crear documento → crear eventos), se realiza en orden seguro y se compensa en caso de fallo. Detalle por flujo en sección 6.
7. **Validación:** se realiza a **nivel aplicación**, no en MongoDB. Razón: el sistema tiene un esquema dinámico (módulo 4.7) cuya forma cambia en runtime; los validadores nativos de MongoDB (JSON Schema) son rígidos y obligarían a redefinirlos en cada cambio. La aplicación, en cambio, ya conoce la colección `esquemas` y aplica las reglas con contexto completo.

---

## 3. Inventario de colecciones

| Colección     | Función                                                                                                                                          | Features principales           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `expedientes` | Caso jurídico — agrupa documentos, contactos, fechas, facturación                                                                                | F-001 a F-008                  |
| `contactos`   | Persona física o jurídica vinculable a expedientes                                                                                               | F-050 a F-055                  |
| `plantillas`  | Documento base con variables `{{objeto.campo}}`                                                                                                  | F-020 a F-029                  |
| `clausulas`   | Cláusulas tipo reutilizables                                                                                                                     | F-040 a F-046                  |
| `documentos`  | Documento concreto dentro de un expediente (generado o subido)                                                                                   | F-010 a F-018                  |
| `eventos`     | Entradas del calendario (auto desde documentos o manuales)                                                                                       | F-060 a F-066                  |
| `facturas`    | Entradas de facturación por expediente                                                                                                           | F-070 a F-075                  |
| `esquemas`    | Esquema dinámico de variables por tipo de objeto                                                                                                 | F-090 a F-096                  |
| `usuarios`    | Usuarios del sistema. En el MVP contiene un único registro; preparado para multi-usuario                                                         | — (preparación arquitectónica) |
| `auditoria`   | Log inmutable de acciones del sistema (create / update / delete / link / generate / login). Detalle en [`ARQUITECTURA.md` §18](ARQUITECTURA.md). | Auditoría legal                |

---

## 4. Detalle por colección

### 4.1 `expedientes`

> Un expediente agrupa toda la información de un caso. _(F-001)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  nombre: String,                              // F-002 (obligatorio)
  fechaCreacion: ISODate,                      // F-002 (auto)
  fechaActualizacion: ISODate,
  activo: Boolean,                             // soft delete
  fechaInactivacion: ISODate | null,
  contactos: [
    {
      contactoId: ObjectId,                    // ref → contactos
      rol: String                              // texto libre — ej. "cliente", "vendedor",
                                               // "comprador", "cliente_principal"…
                                               // F-004, F-018, F-026
    }
  ],
  parametros: {                                // F-003, esquema dinámico
    // claves dinámicas según esquema del tipo "expediente"
    // ej. honorariosBase: 1500, despachoResponsable: "Juan"
  },
  // Las relaciones inversas (documentos, eventos, facturas) NO se duplican aquí:
  // se consultan filtrando esas colecciones por expedienteId.
}
```

**Índices:**

- `{ nombre: "text" }` — búsqueda por nombre (F-007).
- `{ "contactos.contactoId": 1, activo: 1 }` — para resolver "expedientes de un contacto" (F-054).
- `{ usuarioId: 1, activo: 1, fechaCreacion: -1 }` — listado por defecto (filtra por propietario y activos).

**Notas:**

- `parametros` es un sub-documento libre cuya estructura la dicta la colección `esquemas` (entrada `tipoObjeto: "expediente"`). Ver sección 5.
- La pareja `contactoId + rol` debe ser única dentro de un expediente — se valida en aplicación, no en MongoDB.
- `rol` es texto libre. La aplicación puede sugerir valores recientes/comunes en la UI, pero no impone una lista cerrada.

---

### 4.2 `contactos`

> Persona física o jurídica vinculable a uno o varios expedientes. _(F-050)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  tipo: "fisica" | "juridica",                 // F-050
  tipologia: "cliente" | "parte_contraria"
           | "interesado" | "otros",           // F-052
  // Atributos base (F-051)
  nombre: String,                              // nombre y apellidos o razón social
  documentacionFiscal: String,                 // NIF/CIF cifrado AES-256-GCM
  documentoIdentidad: String,                  // DNI/NIE/Pasaporte cifrado AES-256-GCM
  documentacionFiscalHash: String | null,      // hash determinista para duplicados/busqueda exacta
  direccion: String,
  email: String,
  telefono: String,
  // Esquema dinámico (F-051b)
  parametros: {
    // claves dinámicas según esquema del tipo "contacto"
    // ej. profesion: "Arquitecto", estadoCivil: "Casado"
  },
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Indices:**

- `{ usuarioId: 1, nombre: 1 }` - busqueda parcial por nombre dentro del usuario (F-055).
- `{ usuarioId: 1, documentacionFiscalHash: 1 }` - unico parcial (cuando exista valor) para evitar duplicados sin exponer PII.

**Notas:**

- El listado de expedientes en los que está presente un contacto **no se almacena aquí**: se obtiene consultando `expedientes` por `contactos.contactoId` (F-054).

---

### 4.3 `plantillas`

> Documento base con variables `{{objeto.campo}}`. _(F-020 a F-029)_
>
> **Versionado por nuevo documento:** cada edición que se guarda crea **un nuevo registro** en la colección. La versión anterior pasa a `activo: false` y deja de mostrarse en el frontal. Esto preserva la trazabilidad de qué plantilla generó cada documento histórico.

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  // --- Identidad lógica (común a todas las versiones) ---
  plantillaRaizId: ObjectId,                   // ref → primera versión.
                                               // Si _id == plantillaRaizId, es la v1.
  version: Number,                             // 1, 2, 3…
  // --- Contenido de esta versión ---
  nombre: String,
  contenido: String,                           // texto plano con marcadores {{...}}
  formatoOriginal: "txt" | "docx" | "pegado",  // F-020/F-021/F-022
  storagePath: String | null,                  // ruta al archivo original si lo hubo
  variablesDetectadas: [                       // F-023, snapshot de detección al guardar
    {
      raw: String,                             // "{{contacto.vendedor.nombre}}"
      tipoObjeto: String,                      // "contacto"
      rol: String | null,                      // "vendedor" o null
      campo: String,                           // "nombre"
      esArray: Boolean                         // F-025
    }
  ],
  clausulasReferenciadas: [ObjectId],          // F-028, refs → clausulas
  // --- Estado ---
  activo: Boolean,                             // solo la versión vigente está activo:true
  fechaInactivacion: ISODate | null,           // se rellena al sustituirla por una versión más reciente
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ plantillaRaizId: 1, version: -1 }` — recuperar la versión vigente o el historial.
- `{ usuarioId: 1, activo: 1 }` — listado del frontal (solo activas).
- `{ "variablesDetectadas.tipoObjeto": 1, "variablesDetectadas.campo": 1 }` — localizar plantillas afectadas si se renombra una variable del esquema (F-095, post-MVP).

**Notas:**

- `contenido` se guarda como **texto plano** con los marcadores. Cuando el origen es `.docx`, el sistema extrae el texto y lo conserva; el `.docx` original se preserva en Storage para casos donde haga falta el formato exacto.
- `variablesDetectadas` se recalcula al editar el contenido — es una vista materializada para acelerar validaciones y formularios de generación.
- **Edición = nueva versión:** al guardar cambios, el sistema (a) inserta un nuevo documento con `version + 1` y `activo: true`, y (b) marca la versión anterior con `activo: false` y `fechaInactivacion: now`.
- **Documentos generados** referencian siempre la `plantillaId` exacta (la versión concreta usada), no la `plantillaRaizId`. Así un documento histórico siempre sabe en qué versión nació.
- El frontal muestra solo `activo: true`. El historial puede consultarse desde una vista de detalle si se decide exponerlo (post-MVP).

---

### 4.4 `clausulas`

> Fragmentos reutilizables de texto con o sin variables. _(F-040 a F-046)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  nombre: String,                              // título corto identificable
  texto: String,                               // contenido, puede contener {{...}}
  labels: [String],                            // F-045 (libres, múltiples)
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ usuarioId: 1, activo: 1, labels: 1 }` — filtrado por etiqueta dentro del catálogo activo (F-046).
- `{ nombre: "text", texto: "text" }` — búsqueda full-text.

---

### 4.5 `documentos`

> Documento concreto dentro de un expediente. Puede ser **generado** desde plantilla o **subido** preexistente. _(F-010 a F-018)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  expedienteId: ObjectId,                      // ref → expedientes
  nombre: String,
  tipo: "generado" | "subido",                 // F-012 vs F-017
  // --- Solo si tipo = "generado" ---
  plantillaId: ObjectId | null,                // ref → plantillas (versión concreta usada)
  datosCongelados: Object | null,              // F-015, snapshot JSON usado para resolver variables
  clausulasUsadas: [ObjectId] | null,          // refs → clausulas
  // --- Común ---
  storagePath: String,                         // ruta al binario .docx/.pdf/.txt
  formato: "docx" | "pdf" | "txt",             // F-013 (docx para generados), F-017 (otros para subidos)
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ expedienteId: 1, fechaCreacion: -1 }` — listado dentro de un expediente.
- `{ plantillaId: 1 }` — si se quiere saber cuántos documentos usan una plantilla.

**Notas:**

- `datosCongelados` materializa el JSON resuelto — incluye nombre, NIF, importes, etc. de los contactos y expediente en el momento de la generación. **Garantiza inmutabilidad** ante cambios posteriores en `contactos`/`expedientes` (F-015).
- Las **fechas/eventos** del documento **no** se guardan aquí: viven en `eventos` con `documentoId`.

---

### 4.6 `eventos`

> Entradas del calendario, asociadas o no a un documento. _(F-060 a F-066)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  origen: "documento" | "manual",              // F-061 vs F-063
  expedienteId: ObjectId | null,               // siempre presente si origen = "documento"
                                               // opcional si origen = "manual"
  documentoId: ObjectId | null,                // ref → documentos (solo si origen = "documento")
  // Subtipo solo aplica a origen "documento"
  subtipo: "fecha_limite" | "aviso" | "recordatorio" | null,  // F-062
  // Atributos
  titulo: String,
  descripcion: String,
  fechaInicio: ISODate,
  fechaFin: ISODate | null,                    // F-064 (manual)
  color: String | null,                        // F-065 (hex o token)
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ fechaInicio: 1 }` — vista de calendario por rango.
- `{ expedienteId: 1, fechaInicio: 1 }` — fechas del expediente (F-006).
- `{ documentoId: 1 }` — para FL-9 (borrado de documento con eventos).

---

### 4.7 `facturas`

> Entradas de facturación por expediente. _(F-070 a F-075)_

```js
{
  _id: ObjectId,
  usuarioId: ObjectId,                         // propietario, ref → usuarios
  expedienteId: ObjectId,                      // ref → expedientes
  concepto: String,                            // F-072 (obligatorio)
  importe: Number,                             // F-072 (obligatorio, en euros con 2 decimales)
  fecha: ISODate,                              // F-072 (obligatorio, default hoy)
  numero: String | null,                       // F-072 (opcional)
  notas: String | null,                        // F-072 (opcional)
  estado: "pendiente" | "facturado" | "cobrado",  // F-073 (default: pendiente)
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ expedienteId: 1, fecha: -1 }` — listado dentro de la pestaña facturación del expediente.
- `{ estado: 1 }` — para vistas filtradas (post-MVP F-075).

**Notas:**

- El **coste total acumulado** del expediente (F-071) se calcula sobre la marcha (`$sum` agregado por `expedienteId`). No se denormaliza en `expedientes` para evitar inconsistencias.

---

### 4.8 `esquemas`

> Define qué parámetros admite cada tipo de objeto en el esquema dinámico. _(F-090 a F-096)_

```js
{
  _id: ObjectId,
  tipoObjeto: "expediente" | "contacto",       // F-090
  parametros: [
    {
      nombre: String,                          // F-091, ej. "honorariosBase"
      tipoDato: "texto" | "numero" | "fecha" | "booleano",  // F-093
      obligatorio: Boolean,                    // F-096
      fechaCreacion: ISODate
    }
  ],
  fechaActualizacion: ISODate,
}
```

**Convención:** una entrada por `tipoObjeto` y por `usuarioId`. Es decir, cada usuario tiene su propio esquema dinámico.

**Índices:**

- `{ usuarioId: 1, tipoObjeto: 1 }` único compuesto.

**Notas:**

- Cuando se crea un parámetro nuevo (FL-13), se hace `$addToSet` al array `parametros` correspondiente.
- Borrar/renombrar (F-095) es post-MVP — requeriría migración del campo en todas las instancias y validación en plantillas.
- Esta colección **no** lleva `activo`/`fechaInactivacion`: el ciclo de vida lo gestionan los elementos del array `parametros` (un parámetro retirado se marca a nivel de elemento, no de documento entero).

---

### 4.9 `usuarios`

> Colección preparada para multi-usuario. En el MVP contiene un único registro y todas las demás colecciones referencian su `_id` mediante `usuarioId`.

```js
{
  _id: ObjectId,
  email: String,                               // único
  nombre: String,
  rol: "admin" | "usuario",                    // sin uso real en MVP, preparado para futuro
  passwordHash: String | null,                 // null si en MVP no hay autenticación real
  activo: Boolean,
  fechaInactivacion: ISODate | null,
  fechaCreacion: ISODate,
  fechaActualizacion: ISODate,
}
```

**Índices:**

- `{ email: 1 }` único.

**Notas:**

- En el MVP se crea un usuario por defecto al inicializar la base de datos (`seed`). Todas las operaciones del sistema escriben su `_id` en el campo `usuarioId` de los registros que crean.
- Cuando llegue el multi-usuario, las consultas ya filtrarán correctamente por `usuarioId` sin migración del esquema.

---

## 5. Relaciones

```
usuarios   ──← (todas las colecciones de negocio vía usuarioId)

expedientes ─┬─→ contactos       (M:N a través de expedientes.contactos[])
             ├─← documentos      (1:N por documentos.expedienteId)
             ├─← eventos         (1:N por eventos.expedienteId)
             └─← facturas        (1:N por facturas.expedienteId)

documentos ──┬─→ plantillas      (N:1 si tipo = "generado", apunta a versión concreta)
             ├─→ clausulas       (N:M, lista en clausulasUsadas[])
             └─← eventos         (1:N por eventos.documentoId)

plantillas ──┬─→ clausulas       (N:M, lista en clausulasReferenciadas[])
             └─→ plantillas      (autoref vía plantillaRaizId, agrupa versiones)

esquemas    ──○ expedientes      (gobierna .parametros)
            ──○ contactos        (gobierna .parametros)
```

| Tipo                                     | Patrón                                        | Razón                                                                                |
| ---------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Expediente ↔ Contactos                   | M:N **embebido** en `expedientes.contactos[]` | Pocas decenas como mucho; necesitamos rol contextual del contacto en ese expediente. |
| Expediente → Documentos/Eventos/Facturas | 1:N **referenciado**                          | Cardinalidad alta; lectura segmentada.                                               |
| Documento → Plantilla                    | N:1 **referenciado**                          | Plantilla cambia, documento ya generado **no** se ve afectado (snapshot).            |
| Documento ↔ Cláusulas                    | N:M **referenciado**                          | Lista de IDs en `clausulasUsadas`.                                                   |
| Esquema ↔ Instancias                     | implícito                                     | El esquema sólo se valida/usa en aplicación.                                         |

---

## 6. Storage de archivos

**Layout propuesto:**

```
/plantillas/{plantillaId}/{nombreOriginal}.docx
/documentos/generados/{documentoId}/{nombreSlug}.docx
/documentos/subidos/{documentoId}/{nombreSlug}.{ext}
```

**Reglas:**

- Las rutas se guardan en `storagePath` de cada colección. Nunca se reconstruyen desde nombres.
- **Soft delete + Storage:** cuando un registro pasa a `activo: false`, el archivo en Storage **se mantiene**. El archivo solo se elimina si se purgan los inactivos (operación administrativa, fuera del flujo normal).
- **Plantillas inactivadas por nueva versión:** el archivo original de la versión antigua **se mantiene** asociado a su registro inactivo (necesario porque los documentos generados con esa versión pueden seguir referenciándola).
- **Borrado físico de plantilla** (operación admin, no en MVP): el binario original se elimina junto con el registro.

---

## 7. Esquema dinámico — funcionamiento

> El esquema dinámico (módulo funcional 4.7) se materializa con la colección `esquemas` y los sub-documentos `parametros` en `expedientes` y `contactos`.

**Flujo de creación (FL-13):**

1. Usuario añade parámetro `honorariosBase` a un expediente.
2. App actualiza la entrada `esquemas` con `tipoObjeto: "expediente"`:
   ```js
   db.esquemas.updateOne(
     { tipoObjeto: 'expediente' },
     {
       $addToSet: {
         parametros: { nombre: 'honorariosBase', tipoDato: 'numero', obligatorio: false },
       },
     },
   );
   ```
3. App escribe el valor en el expediente concreto:
   ```js
   db.expedientes.updateOne(
     { _id: ... },
     { $set: { "parametros.honorariosBase": 1500 } }
   );
   ```
4. La variable queda disponible para `{{expediente.honorariosBase}}` en plantillas.

**Validación al generar documento (FL-6):**

- Para cada `{{tipoObjeto.campo}}` en la plantilla, se busca:
  - En el esquema (existencia del campo).
  - En la instancia concreta (presencia del valor).
- Falta de valor → formulario lo solicita y, al guardar, se persiste en la instancia (y se añade al esquema si no existía aún).

---

## 8. Decisiones abiertas

- ¿Tamaño máximo de archivo en Storage? Documentos legales escaneados pueden ser pesados. _(Pendiente.)_

### Resueltas

- ✅ **Roles en expediente:** texto libre (la app sugiere comunes/recientes en UI).
- ✅ **Borrado:** soft delete universal — campo `activo: Boolean` y `fechaInactivacion`.
- ✅ **Binario de plantilla tras borrarla:** no se conserva si es borrado físico; en soft delete sí se mantiene.
- ✅ **Versionado de plantillas:** cada edición = nuevo documento Mongo. La versión anterior pasa a `activo: false`. Documentos generados referencian la versión concreta usada.
- ✅ **Colección `usuarios`:** sí, presente desde el MVP con un único registro. Toda colección lleva `usuarioId`.
- ✅ **Validación de tipos:** a nivel **aplicación** (no MongoDB JSON Schema). Justificación: el esquema dinámico cambia en runtime; los validadores nativos serían rígidos. Detalle en convención 7.

---

## 9. Changelog

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-26 | Creación inicial del documento. Inventario de 8 colecciones (`expedientes`, `contactos`, `plantillas`, `clausulas`, `documentos`, `eventos`, `facturas`, `esquemas`) con esquema, índices, relaciones y trazabilidad a features de FUNCIONAL.md. Layout de Storage definido.                                                                                                                                                     |
| 2026-04-26 | Resueltas decisiones de modelo: roles texto libre, **soft delete universal** (`activo` + `fechaInactivacion`), versionado de plantillas por nuevo documento (`plantillaRaizId` + `version`), nueva colección **`usuarios`** y campo `usuarioId` en todas las colecciones de negocio para preparar multi-usuario. Validación a nivel aplicación. Actualizadas convenciones, todas las colecciones, índices, relaciones y storage. |
| 2026-05-17 | `contactos`: `documentacionFiscal` y `documentoIdentidad` quedan cifrados a nivel de aplicacion; duplicados y busqueda exacta por NIF/CIF usan `documentacionFiscalHash`.                                                                                                                                                                                                                                                        |
| 2026-05-17 | `contactos`: indice de nombre alineado con busqueda parcial por usuario (`{ usuarioId: 1, nombre: 1 }`).                                                                                                                                                                                                                                                                                                                         |
