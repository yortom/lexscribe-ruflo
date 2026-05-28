import { z } from 'zod';

// Labels se normalizan a lowercase trimmed (RESEARCH §Open Questions Q2:
// búsqueda de labels case-insensitive → normalizar al persistir y al filtrar).
const LabelSchema = z
  .string()
  .min(1)
  .max(60)
  .trim()
  .transform((s) => s.toLowerCase());

export const CreateClausulaSchema = z
  .object({
    nombre: z.string().min(1).max(200),
    texto: z.string().min(1).max(50000),
    labels: z.array(LabelSchema).default([]),
  })
  .strict();

export const UpdateClausulaSchema = CreateClausulaSchema.partial().strict();

export const QueryClausulaSchema = z
  .object({
    search: z.string().optional(),
    label: LabelSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export type CreateClausulaInput = z.infer<typeof CreateClausulaSchema>;
export type UpdateClausulaInput = z.infer<typeof UpdateClausulaSchema>;
export type QueryClausulaInput = z.infer<typeof QueryClausulaSchema>;
