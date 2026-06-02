import { z } from 'zod';

/** Supported import origins for a plantilla (F-020, F-021, F-022). */
export const FORMATO_ORIGEN = ['txt', 'docx', 'pegado'] as const;
export const FormatoOrigenSchema = z.enum(FORMATO_ORIGEN);

export const CreatePlantillaSchema = z
  .object({
    nombre: z.string().min(1).max(200),
    contenido: z.string().min(1).max(200000),
    formatoOriginal: FormatoOrigenSchema.default('pegado'),
  })
  .strict();

/**
 * Update schema — editing creates a NEW version (PLAN-06 / DATOS §4.3 versionado).
 * nombre is optional so callers can update only contenido.
 */
export const UpdatePlantillaSchema = z
  .object({
    nombre: z.string().min(1).max(200).optional(),
    contenido: z.string().min(1).max(200000),
  })
  .strict();

export const QueryPlantillaSchema = z
  .object({
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

/**
 * Schema for declaring a new dynamic-schema field from the editor (PLAN-04, FL-13).
 * Only expediente/contacto are declarable at schema level.
 * clausula/fecha are rejected — they are not persisted to the dynamic schema
 * (they are resolved from the clause library at generation time).
 * Pitfall 4: do NOT allow clausula/fecha here — service layer enforces this.
 */
export const DeclararVariableSchema = z
  .object({
    tipoObjeto: z.enum(['expediente', 'contacto']),
    nombre: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
    tipoDato: z.enum(['texto', 'numero', 'fecha', 'booleano']).default('texto'),
  })
  .strict();

export type CreatePlantillaInput = z.infer<typeof CreatePlantillaSchema>;
export type UpdatePlantillaInput = z.infer<typeof UpdatePlantillaSchema>;
export type QueryPlantillaInput = z.infer<typeof QueryPlantillaSchema>;
export type DeclararVariableInput = z.infer<typeof DeclararVariableSchema>;
