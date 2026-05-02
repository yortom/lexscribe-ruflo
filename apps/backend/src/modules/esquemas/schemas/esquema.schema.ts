import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { TipoObjeto } from '@lexscribe/shared-validation';

export type EsquemaDocument = HydratedDocument<Esquema>;

@Schema({
  collection: 'esquemas',
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion',
  },
})
export class Esquema {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: ['expediente', 'contacto'] })
  tipoObjeto: TipoObjeto;

  @Prop({
    type: [
      {
        nombre: { type: String, required: true },
        tipoDato: {
          type: String,
          enum: ['texto', 'numero', 'fecha', 'booleano'],
          default: 'texto',
        },
        obligatorio: { type: Boolean, default: false },
        fechaCreacion: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  parametros: Array<{
    nombre: string;
    tipoDato: string;
    obligatorio: boolean;
    fechaCreacion: Date;
  }>;
}

export const EsquemaSchema = SchemaFactory.createForClass(Esquema);

// Unique index: one esquema per usuarioId + tipoObjeto
// NO softDeletePlugin — esquemas excluded per DATOS.md §4.8
EsquemaSchema.index({ usuarioId: 1, tipoObjeto: 1 }, { unique: true });
