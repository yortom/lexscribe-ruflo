---
phase: 06-generaci-n-y-documentos
plan: "01"
subsystem: documentos-generation-backend
tags: [docxtemplater, pizzip, minio, mongoose, tdd, dtos, shared-types]
dependency_graph:
  requires: [05-02-backend-plantillas, 04-02-backend-expedientes, 02-04-esquemas]
  provides: [GenerationService, DocumentosRepository, Documento schema, shared-types Documento, shared-validation GenerateDocumentoSchema]
  affects: [ExpedienteDetailResponse.documentos, StorageService]
tech_stack:
  added: [docxtemplater@3.68.7, pizzip@3.2.0, "@types/pizzip"]
  patterns: [TDD London School, docxtemplater render pipeline, datosCongelados snapshot, softDeletePlugin, buildContext + Pitfall-4 validation]
key_files:
  created:
    - apps/backend/src/modules/documentos/schemas/documento.schema.ts
    - apps/backend/src/modules/documentos/documentos.repository.ts
    - apps/backend/src/modules/documentos/generation/generation.service.ts
    - apps/backend/src/modules/documentos/tests/generation.service.spec.ts
    - packages/shared-types/src/documento.ts
    - packages/shared-validation/src/documentos.ts
  modified:
    - apps/backend/package.json
    - apps/backend/src/common/storage/storage.service.ts
    - packages/shared-types/src/expediente.ts
    - packages/shared-types/src/index.ts
    - packages/shared-validation/src/index.ts
    - pnpm-lock.yaml
decisions:
  - "StorageService.getObject uses GetObjectCommand + Readable stream-to-Buffer; GetObjectCommand already imported from Phase 5 — no new import needed"
  - "datosCongelados = buildContext output passed directly to doc.render() = datosCongelados persisted (one object, no copy) — DOC-07 by design"
  - "Pitfall 4: validateContext iterates variablesDetectadas BEFORE render; throws ValidationError with full list of unresolved variables"
  - "docId pre-computed via new Types.ObjectId() before upload; key includes docId — no update step needed after create"
  - "textoToDocxBuffer imported from plantillas/conversion.ts for storagePath=null case (D-01) — no new file"
  - "NuevoCampoSchema in shared-validation uses z.enum(['expediente','contacto']) — clausula/fecha not declarable (same Pitfall 4 boundary as plantillas)"
metrics:
  duration: ~6 minutes
  completed: "2026-06-02"
  tasks: 3
  files_created: 6
  files_modified: 6
  tests: 7
---

# Phase 06 Plan 01: Backend Pipeline Generacion Summary

docxtemplater pipeline with datosCongelados snapshot: install deps, add StorageService.getObject, shared types + Zod DTOs, Documento Mongoose schema + repository, GenerationService with full buildContext + render + MinIO upload + auto-declare campos, 7 TDD tests green.

## What Was Built

The core document generation pipeline for Lexscribe:

1. **Dependencies**: `docxtemplater@3.68.7` + `pizzip@3.2.0` installed in backend. `@types/pizzip` as devDep.
2. **StorageService.getObject**: Downloads an object from MinIO into a Buffer. Uses `GetObjectCommand` (already imported in Phase 5) + Node `Readable` stream-to-Buffer pattern.
3. **Shared types** (`packages/shared-types/src/documento.ts`): `DatosCongelados`, `Documento`, `DocumentoListResponse`, `DownloadUrlResponse` interfaces. `ExpedienteDetailResponse.documentos` updated from `unknown[]` to `Documento[]`.
4. **Shared validation** (`packages/shared-validation/src/documentos.ts`): `GenerateDocumentoSchema` (plantillaId, valores by tipoObjeto, asignacionesRol, camposNuevos), `QueryDocumentoSchema`, `UploadDocumentoMetaSchema`, `NuevoCampoSchema`.
5. **Documento Mongoose schema** (`schemas/documento.schema.ts`): collection `documentos`, `softDeletePlugin`, `timestamps {createdAt: fechaCreacion, updatedAt: fechaActualizacion}`, `minimize: false`, indexes `{expedienteId:1, fechaCreacion:-1}` and `{plantillaId:1}`.
6. **DocumentosRepository**: `create` (accepts optional `_id`), `findById`, `listByExpediente` (paginated, ordered `fechaCreacion:-1`), `softDelete` (`returnDocument:'after'`).
7. **GenerationService** (`generation/generation.service.ts`): Full pipeline — buildContext → validateContext (Pitfall 4) → getObject/textoToDocxBuffer (D-01) → PizZip + Docxtemplater render → putObject → create document. Auto-declares campos nuevos via `EsquemasService.addParametro` (DOC-03).

## Tests

7 unit tests in `generation.service.spec.ts`, all green:
- Test 1 (DOC-04): buildContext shape `{expediente, contacto, clausula, fecha}` with merged parametros + overrides
- Test 2 (DOC-04): `storage.getObject` called when `storagePath != null`
- Test 2b (D-01): `textoToDocxBuffer` called when `storagePath == null`, `getObject` NOT called
- Test 3 (DOC-04): `storage.putObject` key matches `documentos/generados/{24hex}/{slug}.docx`; `documentosRepo.create` called with `tipo:'generado'`, `formato:'docx'`, `datosCongelados` set
- Test 4 (DOC-07): `datosCongelados` on result equals context passed to `doc.render()` (snapshot immutability)
- Test 5 (DOC-03): `esquemas.addParametro` called once per `camposNuevos` entry with `{nombre, tipoDato, obligatorio:false}`
- Test 6 (Pitfall 4): `ValidationError` thrown with unresolved variable names; `doc.render` NOT called

## Decisions Made

- `datosCongelados` is the exact object passed to `doc.render()` and then passed to `repo.create()` — same reference, no copy, no mutation — DOC-07 satisfied by design.
- `docId = new Types.ObjectId()` generated before upload so the MinIO key can embed the document ID without an additional DB round-trip.
- `validateContext` covers all 4 tipoObjeto: `expediente`/`fecha` as flat lookup, `contacto`/`clausula` as nested `[rol][campo]` lookup.
- `textoToDocxBuffer` imported from existing `plantillas/conversion.ts` — Pitfall 7 pattern b (copy slugify, reuse textoToDocxBuffer directly).
- `NuevoCampoSchema` restricts `tipoObjeto` to `expediente|contacto` — clausula/fecha not declarable (same Pitfall 4 boundary established in Phase 5).

## Deviations from Plan

None — plan executed exactly as written.

The plan specified 6 tests (Tests 1-6); the implementation has 7 (Test 2 split into 2b for the null-storagePath branch) for better coverage of D-01. This is additive, not a deviation.

## Known Stubs

None. All interfaces and services are fully implemented with real logic. No placeholder data flows to rendering.

## Self-Check: PASSED

Files exist:
- `apps/backend/src/modules/documentos/schemas/documento.schema.ts` — FOUND
- `apps/backend/src/modules/documentos/documentos.repository.ts` — FOUND
- `apps/backend/src/modules/documentos/generation/generation.service.ts` — FOUND
- `apps/backend/src/modules/documentos/tests/generation.service.spec.ts` — FOUND
- `packages/shared-types/src/documento.ts` — FOUND
- `packages/shared-validation/src/documentos.ts` — FOUND

Commits:
- `a4df317` feat(06-01): install docxtemplater+pizzip and add StorageService.getObject
- `049e8de` feat(06-01): add Documento/DatosCongelados shared types and Zod DTOs
- `082ff9a` test(06-01): add failing spec for GenerationService (TDD RED)
- `382a3ba` feat(06-01): implement Documento schema, repository and GenerationService pipeline
