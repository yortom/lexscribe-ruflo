import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

@Schema({ _id: false })
export class ContactoVinculado {
  @Prop({ type: Types.ObjectId, ref: 'Contacto', required: true })
  contactoId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  rol!: string;
}
export const ContactoVinculadoSchema = SchemaFactory.createForClass(ContactoVinculado);

export type ExpedienteDocument = HydratedDocument<Expediente>;

@Schema({
  collection: 'expedientes',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Expediente {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  nombre!: string;

  @Prop({ type: [ContactoVinculadoSchema], default: [] })
  contactos!: ContactoVinculado[];

  @Prop({ type: Object, default: {} })
  parametros!: Record<string, unknown>;
}

export const ExpedienteSchema = SchemaFactory.createForClass(Expediente);
ExpedienteSchema.plugin(softDeletePlugin);

// DATOS §4.1
ExpedienteSchema.index({ nombre: 'text' }, { name: 'expediente_text_idx' });
ExpedienteSchema.index({ 'contactos.contactoId': 1, activo: 1 });
ExpedienteSchema.index({ usuarioId: 1, activo: 1, fechaCreacion: -1 });
