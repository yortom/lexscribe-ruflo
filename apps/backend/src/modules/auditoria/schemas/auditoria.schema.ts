import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { AuditAccion } from '../types';

export type AuditoriaDocument = Auditoria & Document;

@Schema({ collection: 'auditoria', timestamps: false, strict: true })
export class Auditoria {
  @Prop({ type: Types.ObjectId, default: null })
  usuarioId!: Types.ObjectId | null;

  @Prop({ required: true, type: String })
  accion!: AuditAccion;

  @Prop({ required: true, type: String })
  recurso!: string;

  @Prop({ type: Types.ObjectId, default: null })
  recursoId!: Types.ObjectId | null;

  @Prop({ type: Object, default: null })
  cambios!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  contexto!: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ required: true, type: Date })
  timestamp!: Date;
}

export const AuditoriaSchema = SchemaFactory.createForClass(Auditoria);

// Indexes for efficient querying
AuditoriaSchema.index({ recurso: 1, recursoId: 1, timestamp: -1 });
AuditoriaSchema.index({ usuarioId: 1, timestamp: -1 });
AuditoriaSchema.index({ timestamp: -1 });
