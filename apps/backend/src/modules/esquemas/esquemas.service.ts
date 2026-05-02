import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { TipoObjeto, AddParametroInput } from '@lexscribe/shared-validation';
import { EsquemasRepository } from './esquemas.repository';
import {
  NotFoundError,
  ConflictError,
  NotImplementedError,
} from '../../common/errors';

@Injectable()
export class EsquemasService {
  constructor(private readonly repo: EsquemasRepository) {}

  async getByTipo(
    usuarioId: string | Types.ObjectId,
    tipoObjeto: TipoObjeto,
  ) {
    const esquema = await this.repo.findByUsuarioAndTipo(usuarioId, tipoObjeto);
    if (!esquema) {
      throw new NotFoundError('esquema', tipoObjeto);
    }
    return esquema;
  }

  async addParametro(
    usuarioId: string | Types.ObjectId,
    tipoObjeto: TipoObjeto,
    dto: AddParametroInput,
  ) {
    // Try atomic add (only when nombre does not exist)
    const updated = await this.repo.addParametro(usuarioId, tipoObjeto, dto);

    if (updated) {
      // Nombre was new — added successfully
      return updated;
    }

    // nombre already exists — check if same tipoDato (idempotent) or different (conflict)
    const existing = await this.repo.findByUsuarioAndTipo(usuarioId, tipoObjeto);
    if (!existing) {
      throw new NotFoundError('esquema', tipoObjeto);
    }

    const existingParam = existing.parametros.find(
      (p) => p.nombre === dto.nombre,
    );
    if (!existingParam) {
      // Race condition — nombre disappeared; retry would work, but return current state
      return existing;
    }

    if (existingParam.tipoDato !== dto.tipoDato) {
      throw new ConflictError(
        `Parameter ${dto.nombre} already exists with different tipoDato`,
      );
    }

    // Same nombre + same tipoDato → idempotent, return current state
    return existing;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteParametro(
    _usuarioId: string | Types.ObjectId,
    _tipoObjeto: TipoObjeto,
    _nombre: string,
  ): never {
    throw new NotImplementedError('Not Implemented (post-MVP F-095)');
  }
}
