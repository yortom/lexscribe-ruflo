import { Injectable } from '@nestjs/common';
import { ContactosRepository } from './contactos.repository';
import { EsquemasService } from '../esquemas/esquemas.service';
import { ConflictError, NotFoundError } from '../../common/errors';
import {
  CreateContactoInput,
  UpdateContactoInput,
  QueryContactoInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ContactosService {
  constructor(
    private readonly repo: ContactosRepository,
    private readonly esquemasService: EsquemasService,
  ) {}

  async list(usuarioId: string, query: QueryContactoInput) {
    const { items, total } = await this.repo.findAll(usuarioId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(usuarioId: string, id: string) {
    const contacto = await this.repo.findById(usuarioId, id);
    if (!contacto) throw new NotFoundError('contacto', id);
    // CONT-05: stub vacío hasta Phase 4 — expedientes module no existe aún
    return {
      ...contacto.toObject(),
      expedientesVinculados: [] as Array<{ _id: string; nombre: string; rol: string }>,
    };
  }

  async create(usuarioId: string, dto: CreateContactoInput) {
    let contacto;
    try {
      contacto = await this.repo.create(usuarioId, dto);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictError('Contact documentacionFiscal already registered');
      }
      throw err;
    }
    // CONT-03: registrar parámetros nuevos en el esquema dinámico (FL-13 Punto A)
    await this.registerParametros(usuarioId, dto.parametros ?? {});
    return contacto;
  }

  async update(usuarioId: string, id: string, dto: UpdateContactoInput) {
    const updated = await this.repo.update(usuarioId, id, dto);
    if (!updated) throw new NotFoundError('contacto', id);
    if (dto.parametros) await this.registerParametros(usuarioId, dto.parametros);
    return updated;
  }

  async remove(usuarioId: string, id: string) {
    const deleted = await this.repo.softDelete(usuarioId, id);
    if (!deleted) throw new NotFoundError('contacto', id);
    return deleted;
  }

  private async registerParametros(
    usuarioId: string,
    parametros: Record<string, unknown>,
  ) {
    for (const nombre of Object.keys(parametros)) {
      await this.esquemasService.addParametro(usuarioId, 'contacto', {
        nombre,
        tipoDato: 'texto',
        obligatorio: false,
      });
    }
  }
}
