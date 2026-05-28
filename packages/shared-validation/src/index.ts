import { z } from 'zod';

export const HealthStatusSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string(),
});

export type HealthStatusInput = z.infer<typeof HealthStatusSchema>;

export * from './auth';
export * from './esquemas';
export * from './contactos';
export * from './clausulas';
