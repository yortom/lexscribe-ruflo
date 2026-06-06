import { z } from 'zod';

// DOC-03: campo nuevo declarado en formulario (tipoDato + valor)
export const NuevoCampoSchema = z.object({
  tipoObjeto: z.enum(['expediente', 'contacto']),
  rol: z.string().min(1).nullable().optional(),
  nombre: z.string().min(1),
  tipoDato: z.enum(['texto', 'numero', 'fecha', 'booleano']).default('texto'),
});

// POST /documentos/generar/:expedienteId
export const GenerateDocumentoSchema = z.object({
  plantillaId: z.string().length(24),
  nombre: z.string().min(1),
  // valores resueltos por el usuario en el formulario, estructura por tipoObjeto:
  // { expediente: {campo: valor}, contacto: { [rol]: {campo: valor} }, fecha: {campo: valor} }
  valores: z.object({
    expediente: z.record(z.unknown()).default({}),
    contacto: z.record(z.record(z.unknown())).default({}),
    clausula: z.record(z.record(z.unknown())).default({}),
    fecha: z.record(z.unknown()).default({}),
  }),
  // asignaciones de rol creadas/elegidas en el modal D-06 (contactoId por rol)
  asignacionesRol: z.array(z.object({ rol: z.string().min(1), contactoId: z.string().length(24) })).default([]),
  // campos nuevos a auto-declarar en esquema (DOC-03)
  camposNuevos: z.array(NuevoCampoSchema).default([]),
});
export type GenerateDocumentoInput = z.infer<typeof GenerateDocumentoSchema>;

export const QueryDocumentoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type QueryDocumentoInput = z.infer<typeof QueryDocumentoSchema>;

export const UploadDocumentoMetaSchema = z.object({
  nombre: z.string().min(1),
});
export type UploadDocumentoMetaInput = z.infer<typeof UploadDocumentoMetaSchema>;
