/**
 * Seed script — see ARQUITECTURA.md §16.
 *
 * Creates:
 *   - Default user (from SEED_USER_EMAIL / SEED_USER_PASSWORD)
 *   - Empty `esquemas` entries for `expediente` and `contacto`
 *   - MinIO bucket `lexscribe` with prefix structure
 *
 * Idempotent: safe to run multiple times.
 *
 * TODO: implement once the corresponding modules are in place.
 */

async function seed() {
  // eslint-disable-next-line no-console
  console.log('seed: not implemented yet — see ARQUITECTURA.md §16');
}

void seed();
