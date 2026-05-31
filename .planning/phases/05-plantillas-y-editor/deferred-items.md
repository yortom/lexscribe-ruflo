# Deferred Items — Phase 05

## Out-of-scope issues discovered during 05-04 execution

### Contactos branch coverage at 69.69% (threshold 70%) — pre-existing from 03-03

- **Discovered during:** Task 3 (full-suite green gate) in 05-04
- **Scope:** `./src/modules/contactos/` branch threshold
- **Status:** Pre-existing — existed before 05-04 work. Verified by running contactos-only tests without any 05-04 files staged.
- **Impact:** `pnpm jest --coverage` exits 1 when covering contactos. Does NOT affect `pnpm -r run test` (no --coverage flag).
- **Root cause:** `contactos.service.ts` branches at 69.23% (the `inferTipoDato` switch cases + `registerParametros` not fully branched)
- **Resolution:** Add 2-3 more branch tests to `contactos.service.spec.ts` covering: `number` param type → 'numero', `boolean` → 'booleano', date-string → 'fecha'. Recommend adding in a future plan (Phase 6 or cleanup plan).
