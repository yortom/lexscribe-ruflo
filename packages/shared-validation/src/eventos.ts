import { z } from 'zod';

// CAL-01 / CAL-02: crear evento (origen documento o manual)
export const CreateEventoSchema = z.object({
  origen: z.enum(['documento', 'manual']),
  expedienteId: z.string().length(24).nullable().optional(),
  documentoId: z.string().length(24).nullable().optional(),
  subtipo: z.enum(['fecha_limite', 'aviso', 'recordatorio']).nullable().optional(),
  titulo: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime().nullable().optional(),
  color: z.string().nullable().optional(),
  mostrarEnCalendario: z.boolean().default(true), // D-01
});
export type CreateEventoInput = z.infer<typeof CreateEventoSchema>;

// CAL-04: actualizar color/visibilidad/otros campos mutables
export const UpdateEventoSchema = CreateEventoSchema.partial().omit({ origen: true });
export type UpdateEventoInput = z.infer<typeof UpdateEventoSchema>;

// CAL-03: filtrado de eventos para vista calendario + pestaña Fechas
export const QueryEventoSchema = z.object({
  expedienteId: z.string().length(24).optional(),
  documentoId: z.string().length(24).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  soloCalendario: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type QueryEventoInput = z.infer<typeof QueryEventoSchema>;

// FL-9: pre-check: contar eventos activos de un documento antes de borrar
export const CountEventoQuerySchema = z.object({
  documentoId: z.string().length(24),
});
export type CountEventoQueryInput = z.infer<typeof CountEventoQuerySchema>;
