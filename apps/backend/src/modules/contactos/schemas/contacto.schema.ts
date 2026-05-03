import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type ContactoDocument = HydratedDocument<Contacto>;

@Schema({
  collection: 'contactos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Contacto {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ required: true, enum: ['fisica', 'juridica'] })
  tipo!: 'fisica' | 'juridica';

  @Prop({
    required: true,
    enum: ['cliente', 'parte_contraria', 'interesado', 'otros'],
  })
  tipologia!: 'cliente' | 'parte_contraria' | 'interesado' | 'otros';

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ type: String, default: null }) documentacionFiscal!: string | null;
  @Prop({ type: String, default: null }) documentoIdentidad!: string | null;
  @Prop({ type: String, default: null }) documentacionFiscalHash!: string | null; // Phase 8 placeholder
  @Prop({ type: String, default: null }) direccion!: string | null;
  @Prop({ type: String, default: null }) email!: string | null;
  @Prop({ type: String, default: null }) telefono!: string | null;

  @Prop({ type: Object, default: {} })
  parametros!: Record<string, unknown>;
}

export const ContactoSchema = SchemaFactory.createForClass(Contacto);

// Aplicar plugin ANTES de definir índices (§Pitfall 1)
ContactoSchema.plugin(softDeletePlugin);

// Index 1: text search en nombre + documentacionFiscal (CONT-04, F-055)
ContactoSchema.index({ nombre: 'text', documentacionFiscal: 'text' });

// Index 2: partial unique en documentacionFiscal (DATOS.md §4.2 + §Pitfall 2)
ContactoSchema.index(
  { usuarioId: 1, documentacionFiscal: 1 },
  {
    unique: true,
    partialFilterExpression: {
      documentacionFiscal: { $exists: true, $type: 'string', $ne: '' },
    },
  },
);

// Index 3: listado con filtro por tipologia
ContactoSchema.index({ usuarioId: 1, activo: 1, tipologia: 1, fechaCreacion: -1 });
