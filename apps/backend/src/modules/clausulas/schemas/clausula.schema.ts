import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type ClausulaDocument = HydratedDocument<Clausula>;

@Schema({
  collection: 'clausulas',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Clausula {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ required: true, type: String })
  texto!: string;

  @Prop({ type: [String], default: [] })
  labels!: string[];
}

export const ClausulaSchema = SchemaFactory.createForClass(Clausula);

ClausulaSchema.plugin(softDeletePlugin);

// Filtrado por label + soft-delete + propietario (DATOS §4.4)
ClausulaSchema.index({ usuarioId: 1, activo: 1, labels: 1 });

// Full-text search nombre/texto — un solo índice text por colección (DATOS §4.4)
ClausulaSchema.index(
  { nombre: 'text', texto: 'text' },
  { weights: { nombre: 5, texto: 1 }, name: 'clausula_text_idx' },
);
