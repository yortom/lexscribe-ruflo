import { describe, it, expect } from 'vitest';
import { QueryEventoSchema } from './eventos';

describe('QueryEventoSchema.soloCalendario', () => {
  it("parses the string 'true' as boolean true", () => {
    expect(QueryEventoSchema.parse({ soloCalendario: 'true' }).soloCalendario).toBe(true);
  });

  it("parses the string 'false' as boolean false (not truthy coercion)", () => {
    // Regression: z.coerce.boolean() turned 'false' into true (Boolean('false') === true).
    expect(QueryEventoSchema.parse({ soloCalendario: 'false' }).soloCalendario).toBe(false);
  });

  it('passes through an actual boolean', () => {
    expect(QueryEventoSchema.parse({ soloCalendario: true }).soloCalendario).toBe(true);
    expect(QueryEventoSchema.parse({ soloCalendario: false }).soloCalendario).toBe(false);
  });

  it('leaves soloCalendario undefined when omitted', () => {
    expect(QueryEventoSchema.parse({}).soloCalendario).toBeUndefined();
  });
});
