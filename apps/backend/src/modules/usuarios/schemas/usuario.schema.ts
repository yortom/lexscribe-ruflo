import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema({ _id: false })
class RefreshToken {
  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: () => new Date() })
  createdAt!: Date;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;
}

const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

@Schema({
  timestamps: { createdAt: 'fechaCreacion', updatedAt: 'fechaActualizacion' },
})
export class Usuario {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  nombre!: string;

  @Prop({ default: 'admin' })
  rol!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: [RefreshTokenSchema], default: [] })
  refreshTokens!: Array<{
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    ip: string | null;
    userAgent: string | null;
  }>;

  fechaCreacion!: Date;
  fechaActualizacion!: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
