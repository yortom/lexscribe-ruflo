import { z } from 'zod';
import { NombreParametroSchema } from './esquemas';

export const TipoPersonaSchema = z.enum(['fisica', 'juridica']);
export const TipologiaContactoSchema = z.enum([
  'cliente', 'parte_contraria', 'interesado', 'otros'
]);

export const CreateContactoSchema = z.object({
  tipo: TipoPersonaSchema,
  tipologia: TipologiaContactoSchema,
  nombre: z.string().min(1),
  documentacionFiscal: z.string().optional(),
  documentoIdentidad: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  parametros: z.record(NombreParametroSchema, z.unknown()).optional().default({}),
}).strict();

export const UpdateContactoSchema = CreateContactoSchema.partial().strict();

export const QueryContactoSchema = z.object({
  search: z.string().optional(),
  tipologia: TipologiaContactoSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export type CreateContactoInput = z.infer<typeof CreateContactoSchema>;
export type UpdateContactoInput = z.infer<typeof UpdateContactoSchema>;
export type QueryContactoInput = z.infer<typeof QueryContactoSchema>;
