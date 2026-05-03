import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

interface PushRefreshTokenInput {
  tokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}

interface RotateRefreshTokenInput {
  tokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectModel(Usuario.name) private readonly model: Model<UsuarioDocument>,
  ) {}

  findByEmail(email: string): Promise<UsuarioDocument | null> {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string | Types.ObjectId): Promise<UsuarioDocument | null> {
    return this.model.findById(id).exec();
  }

  create(data: {
    email: string;
    nombre: string;
    rol: string;
    passwordHash: string;
  }): Promise<UsuarioDocument> {
    return this.model.create(data);
  }

  pushRefreshToken(
    userId: string | Types.ObjectId,
    token: PushRefreshTokenInput,
  ): Promise<UsuarioDocument | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          $push: {
            refreshTokens: {
              ...token,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();
  }

  async rotateRefreshToken(
    userId: string | Types.ObjectId,
    oldTokenHash: string,
    newToken: RotateRefreshTokenInput,
  ): Promise<UsuarioDocument | null> {
    // Step 1: Pull old token atomically (filter ensures token exists)
    const pulled = await this.model
      .findOneAndUpdate(
        {
          _id: userId,
          'refreshTokens.tokenHash': oldTokenHash,
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          $pull: { refreshTokens: { tokenHash: oldTokenHash } } as any,
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!pulled) {
      // Token not found — already rotated or never existed
      return null;
    }

    // Step 2: Push new token
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          $push: {
            refreshTokens: {
              ...newToken,
              createdAt: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  clearAllRefreshTokens(
    userId: string | Types.ObjectId,
  ): Promise<UsuarioDocument | null> {
    return this.model
      .findByIdAndUpdate(userId, { $set: { refreshTokens: [] } }, { new: true })
      .exec();
  }

  pullRefreshToken(
    userId: string | Types.ObjectId,
    tokenHash: string,
  ): Promise<UsuarioDocument | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { refreshTokens: { tokenHash } } as any },
        { new: true },
      )
      .exec();
  }

  findAllWithRefreshTokens(): Promise<UsuarioDocument[]> {
    return this.model
      .find({})
      .select('_id email nombre refreshTokens')
      .exec();
  }
}
