import { z } from 'zod';

// FAC-02: crear entrada de facturación (concepto, importe, fecha opcional → default today, etc.)
export const CreateFacturaSchema = z.object({
  expedienteId: z.string().length(24),
  concepto: z.string().min(1),
  importe: z.number(),
  fecha: z.string().datetime().optional(),
  numero: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  estado: z.enum(['pendiente', 'facturado', 'cobrado']).default('pendiente'),
});
export type CreateFacturaInput = z.infer<typeof CreateFacturaSchema>;

// FAC-04: editar concepto/importe/fecha/numero/notas (estado tiene endpoint dedicado)
export const UpdateFacturaSchema = z.object({
  concepto: z.string().min(1).optional(),
  importe: z.number().optional(),
  fecha: z.string().datetime().optional(),
  numero: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
});
export type UpdateFacturaInput = z.infer<typeof UpdateFacturaSchema>;

// FAC-03: actualizar estado vía endpoint dedicado PATCH /facturas/:id/estado
export const UpdateEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'facturado', 'cobrado']),
});
export type UpdateEstadoInput = z.infer<typeof UpdateEstadoSchema>;

// FAC-01: filtrar facturas por expedienteId con paginación
export const QueryFacturaSchema = z.object({
  expedienteId: z.string().length(24),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type QueryFacturaInput = z.infer<typeof QueryFacturaSchema>;
