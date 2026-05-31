/**
 * Plantilla Mongoose schema (DATOS §4.3).
 * Versioned documents: plantillaRaizId groups all versions; version tracks sequence.
 * softDeletePlugin adds activo + fechaInactivacion (universal pattern).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type PlantillaDocument = HydratedDocument<Plantilla>;

/** Subdocument for a detected template variable (DATOS §4.3 variablesDetectadas). */
@Schema({ _id: false })
class VariableDetectada {
  @Prop({ required: true, type: String })
  raw!: string;

  @Prop({ required: true, type: String })
  tipoObjeto!: string;

  @Prop({ type: String, default: null })
  rol!: string | null;

  @Prop({ required: true, type: String })
  campo!: string;

  @Prop({ type: Boolean, default: false })
  esArray!: boolean;
}

const VariableDetectadaSchema = SchemaFactory.createForClass(VariableDetectada);

@Schema({
  collection: 'plantillas',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
  minimize: false,
})
export class Plantilla {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  /** Groups all versions of this plantilla. v1 has plantillaRaizId === _id. */
  @Prop({ type: Types.ObjectId, index: true })
  plantillaRaizId!: Types.ObjectId;

  @Prop({ required: true, type: Number, default: 1 })
  version!: number;

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ required: true, type: String })
  contenido!: string;

  @Prop({
    type: String,
    enum: ['txt', 'docx', 'pegado'],
    default: 'pegado',
  })
  formatoOriginal!: 'txt' | 'docx' | 'pegado';

  /** Path in MinIO bucket (null for pasted text). e.g. "plantillas/{id}/{name}.docx" */
  @Prop({ type: String, default: null })
  storagePath!: string | null;

  @Prop({ type: [VariableDetectadaSchema], default: [] })
  variablesDetectadas!: VariableDetectada[];

  @Prop({ type: [Types.ObjectId], ref: 'Clausula', default: [] })
  clausulasReferenciadas!: Types.ObjectId[];
}

export const PlantillaSchema = SchemaFactory.createForClass(Plantilla);

// Apply soft-delete plugin (adds activo + fechaInactivacion)
PlantillaSchema.plugin(softDeletePlugin);

// Indexes (DATOS §4.3)
PlantillaSchema.index({ plantillaRaizId: 1, version: -1 });
PlantillaSchema.index({ usuarioId: 1, activo: 1 });
PlantillaSchema.index({ 'variablesDetectadas.tipoObjeto': 1, 'variablesDetectadas.campo': 1 });
