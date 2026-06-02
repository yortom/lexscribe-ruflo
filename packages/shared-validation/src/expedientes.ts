import { z } from 'zod';
import { NombreParametroSchema } from './esquemas';

export const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId');
export const RolSchema = z.string().trim().min(1).max(60);

export const CreateExpedienteSchema = z
  .object({
    nombre: z.string().min(1).max(200),
    parametros: z.record(NombreParametroSchema, z.unknown()).optional().default({}),
  })
  .strict();

export const UpdateExpedienteSchema = CreateExpedienteSchema.partial().strict();

export const QueryExpedienteSchema = z
  .object({
    search: z.string().optional(),
    contactoId: ObjectIdSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export const LinkContactoSchema = z
  .object({
    contactoId: ObjectIdSchema,
    rol: RolSchema,
  })
  .strict();

export type CreateExpedienteInput = z.infer<typeof CreateExpedienteSchema>;
export type UpdateExpedienteInput = z.infer<typeof UpdateExpedienteSchema>;
export type QueryExpedienteInput = z.infer<typeof QueryExpedienteSchema>;
export type LinkContactoInput = z.infer<typeof LinkContactoSchema>;
