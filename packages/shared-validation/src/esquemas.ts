import { z } from 'zod';

export const TIPO_OBJETO = ['expediente', 'contacto'] as const;
export type TipoObjeto = (typeof TIPO_OBJETO)[number];
export const TipoObjetoSchema = z.enum(TIPO_OBJETO);

export const NombreParametroSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);

export const TipoDatoSchema = z.enum(['texto', 'numero', 'fecha', 'booleano']);

export const AddParametroSchema = z
  .object({
    nombre: NombreParametroSchema,
    tipoDato: TipoDatoSchema.default('texto'),
    obligatorio: z.boolean().default(false),
  })
  .strict();

export type AddParametroInput = z.infer<typeof AddParametroSchema>;
