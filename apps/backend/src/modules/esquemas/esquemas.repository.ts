import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Esquema, EsquemaDocument } from './schemas/esquema.schema';
import type { TipoObjeto, AddParametroInput } from '@lexscribe/shared-validation';

function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

@Injectable()
export class EsquemasRepository {
  constructor(
    @InjectModel(Esquema.name)
    private readonly model: Model<EsquemaDocument>,
  ) {}

  findByUsuarioAndTipo(
    usuarioId: string | Types.ObjectId,
    tipoObjeto: TipoObjeto,
  ): Promise<EsquemaDocument | null> {
    return this.model
      .findOne({ usuarioId: toObjectId(usuarioId), tipoObjeto })
      .exec();
  }

  upsertEmpty(
    usuarioId: string | Types.ObjectId,
    tipoObjeto: TipoObjeto,
  ): Promise<EsquemaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { usuarioId: toObjectId(usuarioId), tipoObjeto },
        { $setOnInsert: { parametros: [], fechaCreacion: new Date() } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .exec();
  }

  /**
   * Atomically add a parameter if the nombre does not yet exist.
   * Uses $addToSet with $elemMatch to check for exact nombre match (idempotent for same nombre+tipoDato).
   * Returns the updated doc, or null if nombre already exists (caller checks for conflict).
   */
  async addParametro(
    usuarioId: string | Types.ObjectId,
    tipoObjeto: TipoObjeto,
    dto: AddParametroInput,
  ): Promise<EsquemaDocument | null> {
    // Try to add only if nombre does NOT already exist
    const updated = await this.model
      .findOneAndUpdate(
        {
          usuarioId: toObjectId(usuarioId),
          tipoObjeto,
          'parametros.nombre': { $ne: dto.nombre },
        },
        {
          $addToSet: {
            parametros: {
              nombre: dto.nombre,
              tipoDato: dto.tipoDato,
              obligatorio: dto.obligatorio,
              fechaCreacion: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();

    return updated;
  }
}
