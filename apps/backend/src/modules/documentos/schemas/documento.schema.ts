/**
 * Documento Mongoose schema (DATOS §4.5).
 * softDeletePlugin adds activo + fechaInactivacion (universal pattern).
 * datosCongelados is persisted at generation time and NEVER mutated (DOC-07).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type DocumentoDocument = HydratedDocument<Documento>;

@Schema({
  collection: 'documentos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
  minimize: false,
})
export class Documento {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Expediente', required: true })
  expedienteId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ type: String, enum: ['generado', 'subido'], required: true })
  tipo!: 'generado' | 'subido';

  /** Only set when tipo = 'generado'. */
  @Prop({ type: Types.ObjectId, ref: 'Plantilla', default: null })
  plantillaId!: Types.ObjectId | null;

  /** Snapshot JSON at generation time — NEVER mutated after creation (DOC-07). */
  @Prop({ type: Object, default: null })
  datosCongelados!: Record<string, unknown> | null;

  /** Clausulas referenced in the plantilla at generation time. */
  @Prop({ type: [Types.ObjectId], ref: 'Clausula', default: null })
  clausulasUsadas!: Types.ObjectId[] | null;

  @Prop({ required: true, type: String })
  storagePath!: string;

  @Prop({ type: String, enum: ['docx', 'pdf', 'txt'], required: true })
  formato!: 'docx' | 'pdf' | 'txt';
}

export const DocumentoSchema = SchemaFactory.createForClass(Documento);

// Apply soft-delete plugin (adds activo + fechaInactivacion)
DocumentoSchema.plugin(softDeletePlugin);

// Indexes (DATOS §4.5)
DocumentoSchema.index({ expedienteId: 1, fechaCreacion: -1 });
DocumentoSchema.index({ plantillaId: 1 });
