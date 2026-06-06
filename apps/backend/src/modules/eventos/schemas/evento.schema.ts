/**
 * Evento Mongoose schema (DATOS §4.6).
 * softDeletePlugin adds activo + fechaInactivacion (universal soft-delete pattern).
 * mostrarEnCalendario (D-01): controls visibility in global /calendario view.
 * Events are always visible in the expediente Fechas tab regardless of this flag.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type EventoDocument = HydratedDocument<Evento>;

@Schema({
  collection: 'eventos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Evento {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: String, enum: ['documento', 'manual'], required: true })
  origen!: 'documento' | 'manual';

  @Prop({ type: Types.ObjectId, ref: 'Expediente', default: null })
  expedienteId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Documento', default: null })
  documentoId!: Types.ObjectId | null;

  @Prop({ type: String, enum: ['fecha_limite', 'aviso', 'recordatorio'], default: null })
  subtipo!: 'fecha_limite' | 'aviso' | 'recordatorio' | null;

  @Prop({ required: true, type: String })
  titulo!: string;

  @Prop({ type: String, default: null })
  descripcion!: string | null;

  @Prop({ required: true, type: Date })
  fechaInicio!: Date;

  @Prop({ type: Date, default: null })
  fechaFin!: Date | null;

  @Prop({ type: String, default: null })
  color!: string | null;

  /** D-01: controls visibility in global calendar view; always visible in Fechas tab. */
  @Prop({ type: Boolean, default: true, index: true })
  mostrarEnCalendario!: boolean;
}

export const EventoSchema = SchemaFactory.createForClass(Evento);

// Apply soft-delete plugin (adds activo + fechaInactivacion)
EventoSchema.plugin(softDeletePlugin);

// Indexes (DATOS §4.6)
EventoSchema.index({ fechaInicio: 1 });
EventoSchema.index({ expedienteId: 1, fechaInicio: 1 });
EventoSchema.index({ documentoId: 1 });
EventoSchema.index({ usuarioId: 1, mostrarEnCalendario: 1, fechaInicio: 1 });
