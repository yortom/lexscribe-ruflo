import { Injectable } from '@nestjs/common';
import { ClausulasRepository } from './clausulas.repository';
import { NotFoundError } from '../../common/errors';
import {
  CreateClausulaInput,
  UpdateClausulaInput,
  QueryClausulaInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ClausulasService {
  constructor(private readonly repo: ClausulasRepository) {}

  async list(usuarioId: string, query: QueryClausulaInput) {
    const { items, total } = await this.repo.findAll(usuarioId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(usuarioId: string, id: string) {
    const clausula = await this.repo.findById(usuarioId, id);
    if (!clausula) throw new NotFoundError('clausula', id);
    return clausula;
  }

  async create(usuarioId: string, dto: CreateClausulaInput) {
    return this.repo.create(usuarioId, dto);
  }

  async update(usuarioId: string, id: string, dto: UpdateClausulaInput) {
    const updated = await this.repo.update(usuarioId, id, dto);
    if (!updated) throw new NotFoundError('clausula', id);
    return updated;
  }

  async remove(usuarioId: string, id: string) {
    const deleted = await this.repo.softDelete(usuarioId, id);
    if (!deleted) throw new NotFoundError('clausula', id);
    return deleted;
  }
}
