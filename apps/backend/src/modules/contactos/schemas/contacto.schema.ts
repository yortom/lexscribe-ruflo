import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { decryptPii, encryptPii, hashPii } from '../../../common/crypto/pii-crypto';
import { softDeletePlugin } from '../../../common/plugins/soft-delete.plugin';

export type ContactoDocument = HydratedDocument<Contacto>;

function decryptContactoPii(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
  ret.documentacionFiscal = decryptPii(ret.documentacionFiscal);
  ret.documentoIdentidad = decryptPii(ret.documentoIdentidad);
  return ret;
}

function encryptContactoPii(target: Record<string, unknown>): void {
  if (Object.prototype.hasOwnProperty.call(target, 'documentacionFiscal')) {
    target.documentacionFiscalHash = hashPii(target.documentacionFiscal);
    target.documentacionFiscal = encryptPii(target.documentacionFiscal);
  }
  if (Object.prototype.hasOwnProperty.call(target, 'documentoIdentidad')) {
    target.documentoIdentidad = encryptPii(target.documentoIdentidad);
  }
}

@Schema({
  collection: 'contactos',
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
  toJSON: { transform: decryptContactoPii },
  toObject: { transform: decryptContactoPii },
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
  @Prop({ type: String, default: null }) documentacionFiscalHash!: string | null;
  @Prop({ type: String, default: null }) direccion!: string | null;
  @Prop({ type: String, default: null }) email!: string | null;
  @Prop({ type: String, default: null }) telefono!: string | null;

  @Prop({ type: Object, default: {} })
  parametros!: Record<string, unknown>;
}

export const ContactoSchema = SchemaFactory.createForClass(Contacto);

ContactoSchema.pre('save', function () {
  if (this.isModified('documentacionFiscal')) {
    this.documentacionFiscalHash = hashPii(this.documentacionFiscal);
    this.documentacionFiscal = encryptPii(this.documentacionFiscal);
  }
  if (this.isModified('documentoIdentidad')) {
    this.documentoIdentidad = encryptPii(this.documentoIdentidad);
  }
});

ContactoSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (!update) return;

  const set = (update.$set as Record<string, unknown> | undefined) ?? update;
  encryptContactoPii(set);
  if (update.$set) update.$set = set;
  this.setUpdate(update);
});

ContactoSchema.plugin(softDeletePlugin);

ContactoSchema.index({ usuarioId: 1, nombre: 1 });
ContactoSchema.index(
  { usuarioId: 1, documentacionFiscalHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      documentacionFiscalHash: { $exists: true, $type: 'string', $ne: null },
    },
  },
);
ContactoSchema.index({ usuarioId: 1, activo: 1, tipologia: 1, fechaCreacion: -1 });
