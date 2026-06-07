/**
 * Factura Mongoose schema (DATOS §4.7).
 * softDeletePlugin adds activo + fechaInactivacion (universal soft-delete pattern).
 * estado: pendiente (default) | facturado | cobrado (FAC-03).
 * CRITICAL: softDeletePlugin does NOT intercept .aggregate() — always add activo:true
 * manually in $match stage (Pattern 3, Pitfall 1).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type FacturaDocument = HydratedDocument<Factura>;

@Schema({
  collection: 'facturas',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Factura {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Expediente', required: true })
  expedienteId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  concepto!: string;

  @Prop({ required: true, type: Number })
  importe!: number;

  @Prop({ required: true, type: Date })
  fecha!: Date;

  @Prop({ type: String, default: null })
  numero!: string | null;

  @Prop({ type: String, default: null })
  notas!: string | null;

  @Prop({
    type: String,
    enum: ['pendiente', 'facturado', 'cobrado'],
    default: 'pendiente',
  })
  estado!: 'pendiente' | 'facturado' | 'cobrado';
}

export const FacturaSchema = SchemaFactory.createForClass(Factura);

// Apply soft-delete plugin (adds activo + fechaInactivacion)
FacturaSchema.plugin(softDeletePlugin);

// Indexes (DATOS §4.7)
FacturaSchema.index({ expedienteId: 1, fecha: -1 });
FacturaSchema.index({ estado: 1 });
