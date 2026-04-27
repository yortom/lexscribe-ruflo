# Lexscribe — Definición Funcional

> Documento vivo. Describe **qué hace** la plataforma, no cómo se implementa.
> Toda nueva funcionalidad debe registrarse aquí antes de desarrollarse.

---

## 1. Visión y propósito

Lexscribe es una aplicación de **automatización de contratos y documentos legales tipo**.

**Objetivo principal:** facilitar el relleno y la organización de documentos del mundo legal a partir de plantillas parametrizables, eliminando el trabajo repetitivo de redacción.

**Pilares funcionales:**
- Plantillas de documentos con variables auto-rellenables.
- Organización de toda la información de un caso bajo un expediente.
- Reutilización de cláusulas tipo entre contratos.
- Gestión centralizada de contactos, fechas y eventos.
- Seguimiento de facturación por expediente.

**Decisiones de alcance del MVP:**
- **Mono-usuario** — un solo usuario por instalación. Roles y multi-usuario quedan fuera.
- **Idioma:** español.
- **Formato de salida del documento generado:** `.docx`.
- **Sin documentos pre-cargados:** la plataforma arranca vacía. El usuario debe crear primero una plantilla, identificar variables y, a partir de ahí, generar documentos. El primer caso de uso real será el **contrato de compraventa**, pero no viene dado por defecto.

---

## 2. Actores / Roles

| Rol | Descripción |
|-----|-------------|
| **Usuario (abogado)** | Actor único en el MVP. Crea expedientes, plantillas, cláusulas, contactos, genera documentos y lleva el seguimiento de facturación. |

> **MVP mono-usuario.** Roles adicionales (administrador, cliente lector, secretaría…) quedan fuera de alcance hasta una fase posterior.

---

## 3. Glosario

- **Expediente** — Conjunto de documentos e información asociados a un caso, perteneciente a uno o varios clientes.
- **Documento** — Pieza de contenido (texto) que forma parte de un expediente. Puede generarse desde plantilla.
- **Plantilla** — Documento base con variables que se auto-rellenan al combinarlo con otros datos.
- **Cláusula tipo** — Fragmento de texto reutilizable que se inserta en plantillas/documentos.
- **Variable** — Marcador con sintaxis `{{objeto.campo}}` (ej. `{{contacto.nombreCliente}}`) que se sustituye al rellenar el documento. Detalle en sección 5.2.
- **Contacto** — Persona física o jurídica vinculada a uno o más expedientes.
- **Evento** — Entrada en el calendario, manual o derivada de una fecha de documento.

---

## 4. Módulos funcionales

### 4.1 Expedientes
### 4.2 Documentos y Plantillas
### 4.3 Cláusulas tipo
### 4.4 Contactos
### 4.5 Calendario y Fechas
### 4.6 Facturación
### 4.7 Esquema dinámico de variables

---

## 5. Catálogo de funcionalidades

> **Estados:** 🟦 Propuesta · 🟨 En diseño · 🟧 En desarrollo · 🟩 Implementada · ⬛ Descartada
> **Prioridades:** P0 (MVP imprescindible) · P1 (importante) · P2 (deseable)

### 5.1 Convenciones generales

*(Reservada para futuras convenciones transversales.)*

### 5.2 Formato de variables en plantillas

**Sintaxis adoptada:** `{{objeto.campo}}` — doble llave + ruta separada por puntos.

**Por qué doble llave (`{{...}}`) y no simple (`{...}`):**
- Las llaves simples colisionan con cualquier llave que aparezca legítimamente en el texto del contrato (cifras con formato, fragmentos de código, citas técnicas).
- `{{...}}` es el estándar de facto en motores de plantillas (Mustache, Handlebars) — patrón conocido, parsers maduros disponibles.
- Mucho menos probable encontrarse `{{` o `}}` en texto legal real → menos falsos positivos en la detección automática.

**Estructura del path:**

| Patrón | Ejemplo | Cuándo usarlo |
|--------|---------|---------------|
| `{{objeto.campo}}` | `{{expediente.nombre}}` | Variable simple sobre un objeto único en el contexto. |
| `{{objeto.rol.campo}}` | `{{contacto.cliente.nombre}}` `{{contacto.vendedor.nif}}` | Cuando hay **varios elementos del mismo tipo** y se distinguen por un rol asignado al generar el documento. |
| `{{#each lista}}…{{campo}}…{{/each}}` | `{{#each clausulas}}{{numero}}. {{texto}}{{/each}}` | Iteración sobre listas (cláusulas, múltiples herederos, anexos). *(Marcado como P1 — F-025.)* |

**Reglas:**
1. Identificadores en minúsculas con `_` o camelCase, sin tildes, sin espacios.
2. La primera parte del path identifica siempre el **tipo de objeto** (`expediente`, `contacto`, `clausula`, `fecha`).
3. Si un tipo admite varias instancias en el mismo documento, la segunda parte es el **rol** (no índice numérico — más legible y estable).
4. La detección se hace con expresión regular sobre el texto completo de la plantilla. No se requiere intervención del usuario para "marcar" variables.

**Ejemplo de plantilla y JSON resultante:**

```text
En Madrid, a {{expediente.fechaCreacion}}, comparecen
{{contacto.vendedor.nombre}} con NIF {{contacto.vendedor.nif}}
y {{contacto.comprador.nombre}} con NIF {{contacto.comprador.nif}}…
```

```json
{
  "expediente": { "fechaCreacion": "2026-04-26", "nombre": "Compraventa Piso Goya" },
  "contacto": {
    "vendedor":  { "nombre": "Ana López",   "nif": "12345678A" },
    "comprador": { "nombre": "Luis Pérez",  "nif": "87654321B" }
  }
}
```

> Nota: este formato cubre el MVP. Funcionalidades como condicionales (`{{#if}}`), formateadores de fecha o expresiones más complejas quedan fuera del alcance inicial.

---

### Módulo 4.1 — Expedientes

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-001** | Crear expediente | 🟦 | P0 | El usuario puede crear un expediente asociado a un caso. |
| **F-002** | Atributos base de expediente | 🟦 | P0 | El expediente tiene como mínimo: **nombre del expediente**, **contactos asociados** y **fecha de creación** (auto). |
| **F-003** | Parámetros personalizados de expediente | 🟦 | P0 | El usuario puede generar parámetros propios en un expediente. Una vez creados, pasan a formar parte del **esquema dinámico** del tipo `expediente` (F-090) y quedan disponibles para todos los expedientes y para referenciar desde plantillas como `{{expediente.miParametro}}`. |
| **F-004** | Asociar contactos al expediente | 🟦 | P0 | Un expediente puede tener uno o varios contactos vinculados (cliente/s y otros). |
| **F-005** | Albergar documentos del expediente | 🟦 | P0 | Un expediente reúne todos los documentos del caso. |
| **F-006** | Vista unificada de fechas del expediente | 🟦 | P0 | El expediente muestra todas las fechas heredadas de sus documentos. |
| **F-007** | Listado y búsqueda de expedientes | 🟦 | P1 | El usuario puede listar, filtrar y buscar entre sus expedientes. |
| **F-008** | Sección de facturación dentro del expediente | 🟦 | P0 | Cada expediente cuenta con una sección dedicada a facturación, donde se acumula el **coste total** y se hace seguimiento. Detalle en el módulo 4.6. |

**Relaciones:** Expediente → Contactos · Documentos · Fechas · Facturación.

---

### Módulo 4.2 — Documentos y Plantillas

#### Documentos

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-010** | Crear documento dentro de expediente | 🟦 | P0 | Cada documento pertenece a un expediente. |
| **F-011** | Tipos de documento diversos | 🟦 | P0 | Un expediente admite documentos de distintos tipos. La plataforma arranca **sin** tipos pre-cargados; los tipos surgen a medida que el usuario crea plantillas. Primer caso de uso previsto: contrato de compraventa. |
| **F-012** | Generar documento a partir de plantilla | 🟦 | P0 | El usuario combina una plantilla con datos reales (contactos/expediente/cláusulas) para producir un documento final. |
| **F-013** | Exportar documento generado a `.docx` | 🟦 | P0 | El documento final se exporta en formato Word `.docx`. |
| **F-014** | Plataforma sin contenido inicial | 🟦 | P0 | La plataforma arranca vacía: sin documentos ni plantillas precargados. El flujo de entrada obligado es **crear plantilla → identificar variables → generar documento**. |
| **F-017** | Subir documento preexistente al expediente | 🟦 | P0 | El usuario puede asociar a un expediente un documento ya existente (`.docx`, `.pdf`, `.txt`) sin pasar por una plantilla. Estos documentos se almacenan tal cual; **no** son objeto de auto-relleno ni admiten variables. Sirven para conservar adjuntos del caso (escrituras escaneadas, comunicaciones, sentencias…). |
| **F-018** | Asociar y desasociar contactos a expediente existente | 🟦 | P0 | El usuario puede añadir o quitar contactos asociados a un expediente después de su creación, así como cambiar su rol. Las variables `{{contacto.rol.campo}}` que pierdan su contacto quedan marcadas como no resueltas en futuras generaciones. |
| **F-015** | Documentos generados son inmutables (MVP) | 🟦 | P0 | En el MVP, una vez generado un documento no se edita. Los datos usados para rellenar las variables se **fijan en el momento de generación** (snapshot del JSON de contexto). Si los contactos/expediente cambian después, el documento ya generado **no** se ve afectado. |
| **F-080** | Edición / regeneración de documentos generados | 🟦 | P2 | **Post-MVP.** Permitir actualizar un documento ya generado refrescando los datos enlazados o editándolo directamente. |
| **F-016** | Aviso al borrar documento con eventos asociados | 🟦 | P0 | Al eliminar un documento, si tiene fechas/eventos asociados al expediente, el sistema muestra un aviso: el usuario decide si **conservar** los eventos en el calendario del expediente o **eliminarlos** junto con el documento. |

#### Plantillas

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-020** | Cargar plantilla desde archivo TXT | 🟦 | P0 | El usuario puede subir un `.txt` para iniciar una plantilla. |
| **F-021** | Cargar plantilla desde Word | 🟦 | P0 | El usuario puede subir un `.docx` para iniciar una plantilla. |
| **F-022** | Crear plantilla pegando texto | 🟦 | P0 | El usuario puede pegar texto plano directamente para iniciar una plantilla. |
| **F-023** | Detección automática de variables | 🟦 | P0 | El sistema **recorre el texto importado**, detecta automáticamente todos los marcadores con la sintaxis definida y los expone como variables de la plantilla. El usuario no marca manualmente el texto. |
| **F-024** | Sintaxis de variables `{{objeto.campo}}` | 🟦 | P0 | Las variables siguen el formato `{{objeto.campo}}` con doble llave. Ver detalle y razonamiento en **sección 5.2**. |
| **F-025** | Variables tipo array (listas) | 🟦 | P1 | Variables que representan listas de elementos (ej. múltiples partes, múltiples cláusulas). Sintaxis de iteración detallada en sección 5.2. |
| **F-026** | Origen de variables: contactos | 🟦 | P0 | Una plantilla puede tomar variables de uno o N contactos. Cuando hay varios contactos del mismo tipo se diferencian por **rol** (ej. `cliente`, `vendedor`, `comprador`). |
| **F-027** | Origen de variables: expedientes | 🟦 | P0 | Una plantilla puede tomar variables de uno o N expedientes. |
| **F-028** | Origen de variables: cláusulas | 🟦 | P0 | Una plantilla puede incluir una o N cláusulas tipo como contenido. |
| **F-029** | Resolución por matching contra JSON | 🟦 | P0 | En la generación, el sistema construye un objeto JSON con los datos seleccionados (expediente, contactos, cláusulas) y resuelve cada variable buscando su ruta dentro de ese JSON. |
| **F-030b** | Validación de tipo de objeto en variables | 🟦 | P0 | El detector reconoce solo tipos de objeto válidos (`expediente`, `contacto`, `clausula`, `fecha`). Si encuentra una variable con un tipo desconocido (ej. `{{contrato.algo}}`) muestra un **error controlado** indicando la variable problemática y la línea, sin bloquear la importación pero impidiendo finalizar la plantilla hasta que se resuelva. |

#### Fechas en documentos

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-030** | Definir fecha/plazo en documento (manual) | 🟦 | P0 | El usuario introduce manualmente fechas y plazos asociados al documento. **MVP: manual.** |
| **F-031** | Cálculo automático de fechas por reglas | 🟦 | P2 | Post-MVP: las fechas se calculan según reglas y se completan automáticamente. |
| **F-032** | Variable de tipo fecha | 🟦 | P0 | Las fechas generan un parámetro de tipo `fecha` dentro del documento. |
| **F-033** | Múltiples fechas por documento | 🟦 | P0 | Un mismo documento puede tener varias fechas asociadas. |
| **F-034** | Cada fecha genera un evento de calendario | 🟦 | P0 | Cada fecha del documento crea un evento único en el calendario. |

---

### Módulo 4.3 — Cláusulas tipo

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-040** | Crear cláusula tipo | 🟦 | P0 | El usuario puede dar de alta cláusulas tipo desde un apartado propio (no desde la plantilla). |
| **F-041** | Catálogo / biblioteca de cláusulas | 🟦 | P0 | Las cláusulas se almacenan y consultan desde un repositorio dedicado. |
| **F-042** | Insertar cláusula en documento/plantilla | 🟦 | P0 | El usuario puede referenciar e insertar una cláusula existente dentro de un documento o plantilla. |
| **F-043** | Inserción respetando orden del clausulado | 🟦 | P0 | Al insertar la cláusula se respeta el orden lógico del clausulado del documento. |
| **F-044** | Renumeración automática de cláusulas | 🟦 | P0 | Al insertar una nueva cláusula se renumeran automáticamente las cláusulas existentes de la plantilla afectadas. |
| **F-045** | Atributo `label` en cláusulas | 🟦 | P0 | Las cláusulas admiten **múltiples labels libres** (texto libre, sin lista cerrada). Sirven para filtrar y buscar en la biblioteca. |
| **F-046** | Buscar y filtrar cláusulas por label | 🟦 | P0 | Desde la biblioteca de cláusulas el usuario puede filtrar por etiqueta. |

---

### Módulo 4.4 — Contactos

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-050** | Crear contacto (persona física o jurídica) | 🟦 | P0 | Alta de contactos como persona física o jurídica. |
| **F-051** | Atributos base del contacto | 🟦 | P0 | Atributos base: nombre y apellidos / razón social, documentación fiscal, documento de identidad, dirección, email, teléfono, tipo (F-052). |
| **F-051b** | Parámetros personalizados de contacto | 🟦 | P0 | El usuario puede añadir parámetros propios a un contacto. Pasan a formar parte del **esquema dinámico** del tipo `contacto` (F-090) y quedan disponibles para todos los contactos y para referenciar desde plantillas como `{{contacto.miParametro}}`. |
| **F-052** | Tipología del contacto | 🟦 | P0 | Tipos: `cliente`, `parte contraria`, `interesado`, `otros`. |
| **F-053** | Vincular contacto a N expedientes | 🟦 | P0 | Un contacto puede estar presente en múltiples expedientes. |
| **F-054** | Ver expedientes de un contacto | 🟦 | P0 | Desde un contacto debe ser fácil consultar en qué expedientes aparece. |
| **F-055** | Listado y búsqueda de contactos | 🟦 | P1 | Listar, filtrar y buscar contactos. |

---

### Módulo 4.5 — Calendario y Fechas

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-060** | Vista de calendario | 🟦 | P0 | Vista global con todos los eventos. |
| **F-061** | Evento generado por documento | 🟦 | P0 | Las fechas de documento (plazos, avisos, recordatorios) aparecen automáticamente como eventos. Se definen desde el documento. |
| **F-062** | Subtipos de evento de documento | 🟦 | P0 | Comprende fechas límite, avisos de fechas límite y recordatorios. |
| **F-063** | Evento de inserción manual | 🟦 | P0 | El usuario puede crear un evento manualmente con un botón `(+)`. |
| **F-064** | Atributos de evento manual | 🟦 | P0 | Fecha de inicio, fecha de fin, descripción y tipología del evento. |
| **F-065** | Color personalizable por evento | 🟦 | P1 | El usuario puede cambiar el color de un evento para distinguirlo visualmente. |
| **F-066** | Volcado unificado en calendario | 🟦 | P0 | Todos los eventos (auto y manuales) conviven en la misma vista de calendario. |

---

### Módulo 4.6 — Facturación

> Cada expediente lleva su propia sección de facturación. Es un seguimiento interno (no es un módulo contable completo).

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-070** | Sección de facturación por expediente | 🟦 | P0 | Cada expediente expone una sección de facturación propia, accesible desde el detalle del expediente. |
| **F-071** | Coste total acumulado del expediente | 🟦 | P0 | La sección muestra el coste total como suma de los importes de todas las entradas (excluyendo las anuladas si las hubiera). |
| **F-072** | Registrar entrada de facturación | 🟦 | P0 | El usuario añade entradas con los siguientes campos: <br>• **Concepto** (texto, obligatorio)<br>• **Importe** (número, obligatorio)<br>• **Fecha** (fecha, obligatoria, por defecto hoy)<br>• **Número/referencia** (texto, opcional)<br>• **Notas** (texto libre, opcional)<br>• **Estado** (ver F-073) |
| **F-073** | Estado de cada entrada | 🟦 | P0 | Estados: **pendiente · facturado · cobrado**. El usuario lo actualiza manualmente. Por defecto al crear: `pendiente`. |
| **F-074** | Editar y eliminar entradas de facturación | 🟦 | P0 | Todas las entradas son editables y eliminables en cualquier momento. |
| **F-075** | Visión consolidada de facturación entre expedientes | 🟦 | P2 | Vista global con la facturación total agregada de todos los expedientes. *(Post-MVP.)* |

---

### Módulo 4.7 — Esquema dinámico de variables

> El esquema de cada **tipo de objeto** (`expediente`, `contacto`) **no es fijo**. Crece a medida que el usuario añade parámetros nuevos. Una vez añadido un parámetro, queda disponible para todas las instancias de ese tipo y para referenciarlo desde plantillas.

| ID | Nombre | Estado | Prio | Descripción |
|----|--------|:------:|:----:|-------------|
| **F-090** | Esquema dinámico por tipo de objeto | 🟦 | P0 | El sistema mantiene, por cada tipo de objeto que admite parámetros (`expediente`, `contacto`), el conjunto de variables disponibles. Este conjunto crece con el uso. |
| **F-091** | Crear variable durante la creación/edición de un objeto | 🟦 | P0 | Al crear o editar un expediente o contacto, el usuario puede añadir un parámetro nuevo "al vuelo": indica nombre del campo y valor. El campo queda registrado en el esquema del tipo (F-090). |
| **F-092** | Crear variable desde el editor de plantilla | 🟦 | P0 | Al editar una plantilla, el usuario puede declarar un nuevo parámetro de un tipo conocido (ej. `{{expediente.honorariosBase}}`) sin que exista todavía en ningún expediente. La variable queda registrada en el esquema y se solicitará en futuras generaciones. |
| **F-093** | Tipo de dato del parámetro | 🟦 | P1 | Cada parámetro del esquema tiene un tipo: `texto`, `número`, `fecha`, `booleano`. Por defecto `texto`. |
| **F-094** | Visualización del esquema disponible | 🟦 | P1 | El usuario puede consultar la lista de variables disponibles por tipo de objeto desde una sección de configuración. |
| **F-095** | Renombrar / eliminar variable del esquema | 🟦 | P2 | Permite mantenimiento del esquema. **Post-MVP** porque puede romper plantillas y documentos previos; requiere migración asistida. |
| **F-096** | Variable opcional vs obligatoria | 🟦 | P1 | Un parámetro puede marcarse como obligatorio para todas las instancias del tipo, o como opcional. |

**Reglas:**
1. Los nombres de variable son únicos por tipo de objeto y siguen las reglas de la sección 5.2.
2. Cuando una plantilla referencia `{{contacto.miParam}}` y el contacto seleccionado no tiene valor para ese parámetro, el formulario de generación pide el valor antes de generar.
3. La detección automática de variables al importar una plantilla (F-023) usa el esquema dinámico para validar tipos conocidos (F-030b).

---

## 6. Flujos de usuario clave

> Los flujos describen cómo el usuario consigue un objetivo concreto a través de la plataforma. Se ordenan de forma que cada flujo deja la plataforma en un estado útil para los siguientes.
>
> **Convención:**
> - **Pasos:** numerados, secuenciales.
> - **Variantes / errores:** caminos alternativos relevantes.
> - **Features:** referencias a `F-XXX` del catálogo.

### Mapa de flujos

| ID | Flujo | Depende de |
|----|-------|-----------|
| **FL-1** | Primer arranque (plataforma vacía → primer documento) | — |
| **FL-2** | Crear plantilla desde archivo o texto pegado | — |
| **FL-3** | Crear contacto | — |
| **FL-4** | Crear cláusula tipo en la biblioteca | — |
| **FL-5** | Crear expediente y asociar contactos | FL-3 |
| **FL-6** | Generar documento dentro de un expediente | FL-2, FL-5 |
| **FL-7** | Insertar cláusula tipo en una plantilla con renumeración | FL-2, FL-4 |
| **FL-8** | Añadir fecha a un documento y verla en el calendario | FL-6 |
| **FL-9** | Borrar documento con eventos asociados | FL-8 |
| **FL-10** | Registrar facturación y actualizar estado | FL-5 |
| **FL-11** | Asociar un documento preexistente a un expediente | FL-5 |
| **FL-12** | Asociar / desasociar contactos a un expediente existente | FL-3, FL-5 |
| **FL-13** | Crear una variable / parámetro nuevo (transversal) | — |

---

### FL-1 · Primer arranque

> Recorrido del usuario que entra por primera vez a la plataforma vacía, hasta producir su primer documento generado.

**Precondición:** Plataforma sin contenido (sin plantillas, sin expedientes, sin contactos, sin cláusulas). *(F-014)*

**Pasos:**
1. El usuario accede a la aplicación.
2. La aplicación muestra un estado vacío con orientación sobre el flujo obligado: **plantilla → contactos → expediente → documento**.
3. El usuario ejecuta **FL-2** (crear plantilla).
4. El usuario ejecuta **FL-3** (crear al menos un contacto).
5. El usuario ejecuta **FL-5** (crear expediente y asociar el contacto).
6. El usuario ejecuta **FL-6** (generar documento desde la plantilla en ese expediente).
7. El usuario descarga el `.docx` generado.

**Postcondición:** plataforma con 1 plantilla, 1 contacto, 1 expediente y 1 documento generado.

**Features:** F-014, F-020/F-021/F-022, F-050, F-001, F-012, F-013.

---

### FL-2 · Crear plantilla desde archivo o texto pegado

**Precondición:** ninguna.

**Pasos:**
1. El usuario va a la sección de **Plantillas** y pulsa "Nueva plantilla".
2. Elige el origen del contenido:
   - Subir archivo `.txt` *(F-020)*.
   - Subir archivo `.docx` *(F-021)*.
   - Pegar texto plano *(F-022)*.
3. La aplicación carga el contenido y lo muestra en el editor.
4. El sistema **recorre el texto** y detecta automáticamente todas las variables con sintaxis `{{objeto.campo}}` *(F-023, F-024)*.
5. El sistema lista las variables detectadas, agrupadas por tipo de objeto (`expediente`, `contacto`, `clausula`, `fecha`).
6. El sistema valida cada variable contra los tipos conocidos *(F-030b)*.
7. El usuario asigna un nombre y guarda la plantilla.

**Variantes / errores:**
- **Variable con tipo desconocido** (ej. `{{contrato.algo}}`): el sistema muestra un error controlado señalando la variable y la línea, e impide guardar la plantilla hasta que se corrija el texto o se renombre la variable *(F-030b)*.
- **Variable con tipo conocido pero campo nuevo** (ej. `{{expediente.honorariosBase}}` cuando `honorariosBase` no existe en el esquema): el sistema ofrece declarar el parámetro en el esquema dinámico — ver **FL-13 punto de entrada B** *(F-092)*.
- **Plantilla sin variables detectadas:** el sistema avisa pero permite guardar (puede ser una plantilla estática que solo necesita reordenarse o ampliarse luego).

**Postcondición:** plantilla disponible en la biblioteca, lista para generar documentos.

**Features:** F-020, F-021, F-022, F-023, F-024, F-026, F-027, F-028, F-030b.

---

### FL-3 · Crear contacto

**Precondición:** ninguna.

**Pasos:**
1. El usuario entra en la sección **Contactos** y pulsa "Nuevo contacto".
2. Selecciona si es persona **física** o **jurídica** *(F-050)*.
3. Rellena los atributos: nombre y apellidos / razón social, documentación fiscal, documento de identidad, dirección, email, teléfono *(F-051)*.
4. Selecciona la **tipología**: `cliente`, `parte contraria`, `interesado` u `otros` *(F-052)*.
5. Guarda.

**Postcondición:** el contacto queda disponible para asociarlo a expedientes (FL-5).

**Features:** F-050, F-051, F-052.

---

### FL-4 · Crear cláusula tipo

**Precondición:** ninguna.

**Pasos:**
1. El usuario entra en la sección **Cláusulas** y pulsa "Nueva cláusula" *(F-040, F-041)*.
2. Escribe el texto de la cláusula. Puede contener variables `{{objeto.campo}}` que se resolverán al generar el documento.
3. Asigna uno o varios **labels libres** (ej. `garantía`, `compraventa`, `aplazamiento`) *(F-045)*.
4. Guarda.

**Postcondición:** la cláusula queda en la biblioteca y puede insertarse en plantillas o documentos.

**Features:** F-040, F-041, F-045.

---

### FL-5 · Crear expediente y asociar contactos

**Precondición:** existe al menos un contacto (FL-3).

**Pasos:**
1. El usuario entra en **Expedientes** y pulsa "Nuevo expediente" *(F-001)*.
2. Introduce el **nombre** del expediente. La **fecha de creación** se asigna automáticamente *(F-002)*.
3. Asocia uno o varios contactos existentes, indicando el rol de cada uno (ej. `cliente`, `vendedor`, `comprador`) *(F-004, F-026)*.
4. (Opcional) Define **parámetros personalizados** del expediente que luego podrán usarse como `{{expediente.miParametro}}` *(F-003)*.
5. Guarda.

**Postcondición:** expediente creado, vinculado a sus contactos, con su sección de facturación vacía *(F-008, F-070)* y con vista de fechas vacía *(F-006)*.

**Features:** F-001, F-002, F-003, F-004, F-006, F-008.

---

### FL-6 · Generar documento dentro de un expediente

**Precondición:** existe una plantilla (FL-2) y un expediente con sus contactos (FL-5).

**Pasos:**
1. Desde el detalle del expediente, el usuario pulsa "Nuevo documento" *(F-010)*.
2. Selecciona la **plantilla** a usar.
3. La aplicación muestra el formulario de relleno: lista todas las variables detectadas en la plantilla, agrupadas por origen (expediente / contactos / cláusulas).
4. Para cada variable:
   - Si proviene del expediente o sus contactos asociados → se pre-rellena automáticamente.
   - Si requiere un rol no asignado (ej. `vendedor`, `comprador`) → el usuario selecciona qué contacto del expediente cumple ese rol *(F-026)*.
   - Si proviene de una cláusula → el usuario selecciona la(s) cláusula(s) de la biblioteca *(F-028, F-042)*.
   - Si es un campo libre → el usuario lo introduce manualmente.
5. El usuario revisa los valores y pulsa "Generar".
6. El sistema construye el JSON de contexto y resuelve cada `{{objeto.campo}}` contra él *(F-029)*.
7. El sistema produce el `.docx` final y lo guarda en el Storage *(F-013)*.
8. Los datos usados quedan **congelados** en el documento generado *(F-015)*.

**Variantes / errores:**
- **Variable sin valor en el JSON de contexto:** el sistema marca el campo como obligatorio y no permite generar hasta resolverlo.
- **Variable nueva no presente en el esquema** (ej. la plantilla pide un parámetro que aún no existe en el contacto): el formulario lo solicita como campo nuevo y, al guardar, lo añade al esquema dinámico — ver **FL-13 punto de entrada C** *(F-091)*.
- **Cambios posteriores en contactos/expediente:** no afectan al documento ya generado (F-015). La regeneración queda como F-080 (post-MVP).

**Postcondición:** documento `.docx` disponible para descarga, listado dentro del expediente.

**Features:** F-010, F-012, F-013, F-015, F-026, F-027, F-028, F-029, F-042.

---

### FL-7 · Insertar cláusula tipo en una plantilla con renumeración

**Precondición:** existe la plantilla (FL-2) y al menos una cláusula tipo en la biblioteca (FL-4).

**Pasos:**
1. El usuario abre la plantilla en el editor.
2. Coloca el cursor en la posición donde quiere insertar la cláusula.
3. Pulsa "Insertar cláusula" y busca/filtra en la biblioteca por **label** *(F-045, F-046)*.
4. Selecciona la cláusula y confirma la inserción *(F-042)*.
5. El sistema inserta el texto de la cláusula respetando el orden del clausulado *(F-043)*.
6. El sistema **renumera automáticamente** todas las cláusulas afectadas en la plantilla *(F-044)*.
7. El usuario revisa y guarda.

**Postcondición:** la plantilla incorpora la cláusula con la numeración correcta.

**Features:** F-042, F-043, F-044, F-045, F-046.

---

### FL-8 · Añadir fecha a un documento y verla en el calendario

**Precondición:** existe un documento dentro de un expediente (FL-6).

**Pasos:**
1. El usuario abre el documento desde el expediente.
2. En la sección de fechas pulsa "Añadir fecha" *(F-030)*.
3. Introduce manualmente fecha, descripción y subtipo del evento (fecha límite, aviso o recordatorio) *(F-062)*.
4. Guarda.
5. El sistema:
   - Crea una variable de tipo `fecha` en el documento *(F-032)*.
   - Crea un evento único en el calendario asociado al expediente *(F-034, F-061)*.
   - La fecha aparece en la vista de fechas del expediente *(F-006)*.
6. El usuario verifica el evento en el **Calendario** *(F-060, F-066)*.

**Variantes:**
- **Múltiples fechas en el mismo documento:** repetir el paso 2 — cada fecha genera su propio evento *(F-033, F-034)*.

**Postcondición:** evento visible en calendario y en el expediente.

**Features:** F-006, F-030, F-032, F-033, F-034, F-060, F-061, F-062, F-066.

---

### FL-9 · Borrar documento con eventos asociados

**Precondición:** existe un documento con al menos una fecha asociada (FL-8).

**Pasos:**
1. El usuario abre el documento y pulsa "Eliminar".
2. El sistema detecta los eventos asociados al documento dentro del expediente *(F-016)*.
3. Muestra un **aviso de confirmación** con dos opciones:
   - **Conservar los eventos** en el calendario del expediente.
   - **Eliminar los eventos** junto con el documento.
4. El usuario elige una opción.
5. El sistema ejecuta la acción correspondiente y elimina el documento.

**Postcondición:** documento eliminado; eventos conservados o eliminados según elección del usuario.

**Features:** F-016.

---

### FL-10 · Registrar facturación y actualizar estado

**Precondición:** existe un expediente (FL-5).

**Pasos:**
1. El usuario entra en el expediente, pestaña **Facturación** *(F-070)*.
2. Pulsa "Nueva entrada".
3. Rellena: concepto (obligatorio), importe (obligatorio), fecha (por defecto hoy), número/referencia (opcional), notas (opcional). El estado por defecto es `pendiente` *(F-072, F-073)*.
4. Guarda.
5. El sistema actualiza el **coste total acumulado** del expediente *(F-071)*.
6. Más adelante, el usuario edita la entrada para cambiar el estado a `facturado` y, posteriormente, a `cobrado` *(F-073, F-074)*.

**Variantes:**
- **Editar campos de la entrada** (importe, concepto…): permitido en cualquier momento *(F-074)*.
- **Eliminar entrada:** permitido; el coste total se recalcula *(F-074, F-071)*.

**Postcondición:** entrada registrada, total actualizado, seguimiento del estado disponible.

**Features:** F-070, F-071, F-072, F-073, F-074.

---

### FL-11 · Asociar un documento preexistente a un expediente

> Sirve para incorporar al expediente documentos que **no** se generan desde plantilla: escrituras escaneadas, sentencias, comunicaciones recibidas, anexos.

**Precondición:** existe el expediente (FL-5).

**Pasos:**
1. Desde el detalle del expediente, el usuario pulsa "Subir documento".
2. Selecciona un archivo `.docx`, `.pdf` o `.txt` desde el equipo *(F-017)*.
3. (Opcional) Asigna un nombre y una descripción al documento.
4. Confirma la subida.
5. El sistema almacena el archivo en el Storage y lo lista dentro del expediente *(F-005)*.

**Variantes:**
- El usuario puede añadir fechas manuales al documento subido siguiendo **FL-8** (los documentos importados también admiten eventos de calendario).
- Estos documentos **no** son objeto de auto-relleno y **no** generan variables.

**Postcondición:** documento adjunto disponible en el expediente.

**Features:** F-005, F-017.

---

### FL-12 · Asociar / desasociar contactos a un expediente existente

**Precondición:** existe el expediente (FL-5) y al menos un contacto (FL-3).

**Pasos:**
1. El usuario abre el expediente y va a la sección de contactos.
2. **Para añadir un contacto:**
   1. Pulsa "Añadir contacto".
   2. Busca y selecciona un contacto existente (o ejecuta FL-3 inline para crear uno nuevo).
   3. Asigna un **rol** dentro del expediente (ej. `cliente`, `vendedor`, `comprador`) *(F-004, F-018)*.
   4. Confirma.
3. **Para cambiar el rol** de un contacto ya asociado: edita el rol desde la fila del contacto *(F-018)*.
4. **Para desasociar un contacto:** pulsa "Quitar". El sistema muestra una advertencia si ese rol está siendo usado por alguna variable referenciada en plantillas *(F-018)*.

**Variantes / errores:**
- **Rol duplicado:** si ya existe un contacto con el rol `vendedor` y el usuario intenta asignar el mismo rol a otro contacto, el sistema obliga a renombrar el rol o reemplazar el contacto.
- **Documento ya generado:** los documentos generados antes del cambio **no** se ven afectados — sus datos están congelados (F-015).

**Postcondición:** lista de contactos del expediente actualizada con sus roles.

**Features:** F-004, F-015, F-018.

---

### FL-13 · Crear una variable / parámetro nuevo (transversal)

> Este flujo describe los **3 puntos de entrada** desde los que el usuario puede crear una variable nueva. El resultado en los tres casos es el mismo: la variable queda registrada en el esquema dinámico del tipo de objeto.

**Precondición:** ninguna.

**Punto de entrada A — Durante la creación / edición de un expediente o contacto** *(F-091)*:
1. El usuario está creando o editando el objeto.
2. Pulsa "Añadir parámetro".
3. Indica:
   - Nombre del parámetro (ej. `honorariosBase`).
   - Tipo de dato: `texto`, `número`, `fecha`, `booleano` *(F-093)*.
   - Valor para esta instancia.
4. Guarda. El parámetro queda registrado en el esquema del tipo *(F-090)*.

**Punto de entrada B — Desde el editor de plantilla** *(F-092)*:
1. El usuario edita la plantilla y escribe `{{expediente.honorariosBase}}` (variable que aún no existe).
2. Al ejecutarse la detección automática (F-023), el sistema reconoce que el tipo `expediente` es válido (F-030b) pero el campo `honorariosBase` no está en el esquema.
3. El sistema ofrece **declarar el nuevo parámetro** en el esquema:
   - Confirma nombre.
   - Selecciona tipo de dato.
4. El parámetro queda registrado *(F-090)* y la plantilla se valida.

**Punto de entrada C — Durante la generación de un documento** *(F-091)*:
1. El usuario está generando un documento (FL-6) y la plantilla referencia `{{contacto.cliente.profesion}}`.
2. El contacto en rol `cliente` no tiene aún el parámetro `profesion`.
3. El formulario de generación lo solicita como campo nuevo: el usuario introduce el valor.
4. Al guardar, el parámetro se añade al esquema del tipo `contacto` y al contacto concreto.

**Variantes / errores:**
- **Nombre ya usado:** si el nombre del parámetro coincide con uno existente del esquema, el sistema lo señala y reutiliza el existente.
- **Nombre inválido** (con tildes, espacios o símbolos): el sistema rechaza el nombre y muestra las reglas de la sección 5.2.

**Postcondición:** el parámetro queda en el esquema del tipo de objeto y disponible para:
- Otras instancias del mismo tipo (otros expedientes / contactos).
- Cualquier plantilla que lo referencie con `{{tipo.nombreParametro}}`.

**Features:** F-023, F-030b, F-090, F-091, F-092, F-093.

---

## 7. Fuera de alcance (por ahora)

- Cálculo automático de fechas mediante reglas (post-MVP, ver F-031).
- Roles y permisos multi-usuario (MVP es mono-usuario).
- Salida en formatos distintos a `.docx` (PDF u otros, post-MVP).
- Multi-idioma de la plataforma (MVP solo en español).
- Módulo contable completo (lo del MVP es seguimiento interno, no facturación fiscal).
- Portal de cliente / acceso externo a expedientes.
- Firma electrónica de documentos.
- Integraciones externas (e-mail, sistemas judiciales, etc.).
- **Edición de documentos ya generados** (post-MVP, ver F-080). En el MVP los documentos generados son inmutables; si hay un cambio se regenera.
- Borrado de contactos vinculados a expedientes con documentos generados — los datos del contacto se "congelan" en el documento al generarlo, ver F-029 y F-080.
- Sintaxis avanzada de plantillas: condicionales (`{{#if}}`), formateadores, expresiones.

*Esta lista evita el scope creep. Mover algo de aquí a "en alcance" requiere actualización explícita del documento.*

---

## 8. Preguntas abiertas

*(Sin preguntas abiertas relevantes en este momento. Cualquier nueva duda funcional debe registrarse aquí antes de pasar a diseño técnico.)*

### Resueltas

- ✅ **Atributos base de expediente:** nombre, contactos asociados, fecha de creación + sección de facturación.
- ✅ **Tipos de documento iniciales:** ninguno pre-cargado. Primer caso de uso: contrato de compraventa.
- ✅ **Categorización de cláusulas:** labels libres, múltiples por cláusula.
- ✅ **Multi-usuario en MVP:** no, mono-usuario.
- ✅ **Formato de salida:** `.docx`.
- ✅ **Idioma:** español.
- ✅ **Factura tipo simple:** importe, concepto, fecha, estado.
- ✅ **Estados de facturación:** pendiente / facturado / cobrado.
- ✅ **Detección de variables:** automática sobre `{{objeto.campo}}`, formato propuesto en sección 5.2.
- ✅ **Integridad referencial al borrar contactos:** los datos se congelan en el documento al generarse (F-015). Edición/regeneración queda como F-080 post-MVP.
- ✅ **Campos de la factura:** concepto, importe, fecha (obligatorios) + número/referencia y notas (opcionales) + estado. Todo editable.
- ✅ **Borrado de documento con eventos:** muestra aviso preguntando si conservar o eliminar los eventos del expediente (F-016).
- ✅ **Restricciones en labels:** ninguna.
- ✅ **Detección de variables con tipo desconocido:** error controlado (F-030b).

---

## 9. Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-26 | Creación inicial del documento con módulos: Expedientes, Documentos/Plantillas, Cláusulas, Contactos, Calendario. |
| 2026-04-26 | Resueltas decisiones de alcance MVP (mono-usuario, español, salida `.docx`, sin documentos pre-cargados). Concretados atributos base de expediente (F-002) y añadido F-008 (sección facturación). Añadidos F-013 (export `.docx`), F-014 (plataforma sin contenido inicial), F-045/F-046 (labels en cláusulas). Nuevo módulo **4.6 Facturación** (F-070 a F-074). Actualizadas secciones 1, 2, 7 y 8. |
| 2026-04-26 | Definido formato de variables `{{objeto.campo}}` en nueva **sección 5.2** (doble llave + path por puntos + roles para múltiples instancias). F-024 actualizada y nuevo F-029 (resolución por matching contra JSON). Concretadas F-072 (factura simple) y F-073 (estados pendiente/facturado/cobrado). Añadidos F-015 (documentos inmutables en MVP) y F-080 (edición de documentos como post-MVP). Refrescadas secciones 7 y 8. |
| 2026-04-26 | Cerradas últimas preguntas abiertas. Detallados campos de la entrada de facturación en F-072 (concepto, importe, fecha, número, notas, estado) y nuevo F-074 (editar/eliminar entradas) — F-074 anterior renumerada a F-075. Nuevo F-016: aviso al borrar documento con eventos asociados. Nuevo F-030b: validación de tipo de objeto en variables (error controlado). Sin preguntas abiertas pendientes. |
| 2026-04-26 | Detallada **sección 6 Flujos de usuario clave**: 10 flujos (FL-1 a FL-10) con precondiciones, pasos numerados, variantes/errores, postcondiciones y referencias a features. Añadido mapa de dependencias entre flujos. |
| 2026-04-26 | Concepto de **esquema dinámico de variables**: nuevo módulo **4.7** (F-090 a F-096), F-051b para parámetros personalizados de contacto, F-003 actualizada. Nuevas features F-017 (subir documento preexistente al expediente) y F-018 (asociar/desasociar contactos a expediente existente). Nuevos flujos **FL-11**, **FL-12** y **FL-13** (creación transversal de variables, con 3 puntos de entrada). FL-2 y FL-6 actualizadas para integrarse con FL-13. |
