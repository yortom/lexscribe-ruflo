import { Injectable } from '@nestjs/common';
import { ContactosRepository } from './contactos.repository';
import { EsquemasService } from '../esquemas/esquemas.service';
import { ConflictError, NotFoundError } from '../../common/errors';
import {
  CreateContactoInput,
  UpdateContactoInput,
  QueryContactoInput,
  type AddParametroInput,
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
    // CONT-03: registrar parámetros ANTES de persistir el contacto.
    // Si un parámetro tipo conflicta con el esquema dinámico existente,
    // registerParametros lanza ConflictError y queremos abortar la creación
    // sin dejar contactos huérfanos en la BD.
    await this.registerParametros(usuarioId, dto.parametros ?? {});
    try {
      return await this.repo.create(usuarioId, dto);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictError('Contact documentacionFiscal already registered');
      }
      throw err;
    }
  }

  async update(usuarioId: string, id: string, dto: UpdateContactoInput) {
    // Validar/registrar parámetros antes del update para fail-fast sin
    // mutar el contacto si los tipos chocan con el esquema dinámico.
    if (dto.parametros) await this.registerParametros(usuarioId, dto.parametros);
    const updated = await this.repo.update(usuarioId, id, dto);
    if (!updated) throw new NotFoundError('contacto', id);
    return updated;
  }

  async remove(usuarioId: string, id: string) {
    const deleted = await this.repo.softDelete(usuarioId, id);
    if (!deleted) throw new NotFoundError('contacto', id);
    return deleted;
  }

  private async registerParametros(usuarioId: string, parametros: Record<string, unknown>) {
    for (const nombre of Object.keys(parametros)) {
      await this.esquemasService.addParametro(usuarioId, 'contacto', {
        nombre,
        tipoDato: this.inferTipoDato(parametros[nombre]),
        obligatorio: false,
      });
    }
  }

  private inferTipoDato(value: unknown): AddParametroInput['tipoDato'] {
    if (typeof value === 'number') return 'numero';
    if (typeof value === 'boolean') return 'booleano';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'fecha';
    }
    return 'texto';
  }
}
