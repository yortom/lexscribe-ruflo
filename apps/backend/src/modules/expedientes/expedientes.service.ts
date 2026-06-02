import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { ExpedientesRepository } from './expedientes.repository';
import { EsquemasService } from '../esquemas/esquemas.service';
import { ContactosRepository } from '../contactos/contactos.repository';
import { ConflictError, NotFoundError } from '../../common/errors';
import type { AuditEventPayload } from '../auditoria/listeners/audit.listener';
import {
  CreateExpedienteInput,
  UpdateExpedienteInput,
  QueryExpedienteInput,
  LinkContactoInput,
  type AddParametroInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ExpedientesService {
  constructor(
    private readonly repo: ExpedientesRepository,
    private readonly esquemasService: EsquemasService,
    private readonly contactosRepo: ContactosRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(usuarioId: string, query: QueryExpedienteInput) {
    const { items, total } = await this.repo.findAll(usuarioId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(usuarioId: string, id: string) {
    const expediente = await this.repo.findById(usuarioId, id);
    if (!expediente) throw new NotFoundError('expediente', id);
    // EXPE-06 / EXPE-07: placeholders hasta Phase 7 (fechas) y Phase 6 (documentos)
    return {
      ...expediente.toObject(),
      documentos: [] as unknown[],
      fechas: [] as unknown[],
    };
  }

  async create(usuarioId: string, dto: CreateExpedienteInput) {
    // EXPE-04: registrar parámetros ANTES de persistir (fail-fast si tipo conflicta).
    await this.registerParametros(usuarioId, dto.parametros ?? {});
    return this.repo.create(usuarioId, dto);
  }

  async update(usuarioId: string, id: string, dto: UpdateExpedienteInput) {
    if (dto.parametros) await this.registerParametros(usuarioId, dto.parametros);
    const updated = await this.repo.update(usuarioId, id, dto);
    if (!updated) throw new NotFoundError('expediente', id);
    return updated;
  }

  async remove(usuarioId: string, id: string) {
    const deleted = await this.repo.softDelete(usuarioId, id);
    if (!deleted) throw new NotFoundError('expediente', id);
    return deleted;
  }

  async linkContacto(usuarioId: string, expedienteId: string, dto: LinkContactoInput) {
    // 1. Verificar que el contacto existe y pertenece al usuario (sin transacción — DATOS §2.6)
    const contacto = await this.contactosRepo.findById(usuarioId, dto.contactoId);
    if (!contacto) throw new NotFoundError('contacto', dto.contactoId);

    // 2. Verificar unicidad (contactoId, rol) en aplicación (EXPE-03)
    const expediente = await this.repo.findById(usuarioId, expedienteId);
    if (!expediente) throw new NotFoundError('expediente', expedienteId);
    const duplicate = expediente.contactos.some(
      (c) => c.contactoId.toString() === dto.contactoId && c.rol === dto.rol,
    );
    if (duplicate) {
      throw new ConflictError(
        `Contacto ya vinculado con rol "${dto.rol}" a este expediente`,
      );
    }

    // 3. $push (la unicidad ya está validada arriba)
    const updated = await this.repo.pushContacto(usuarioId, expedienteId, {
      contactoId: new Types.ObjectId(dto.contactoId),
      rol: dto.rol,
    });

    // 4. Emitir evento para AuditListener (wildcard '*.linked')
    this.eventEmitter.emit('expedientes.linked', {
      usuarioId,
      recurso: 'expediente',
      recursoId: expedienteId,
      contexto: { contactoId: dto.contactoId, rol: dto.rol },
    } satisfies AuditEventPayload);

    return updated;
  }

  async unlinkContacto(
    usuarioId: string,
    expedienteId: string,
    contactoId: string,
    rol: string,
  ) {
    const before = await this.repo.findById(usuarioId, expedienteId);
    if (!before) throw new NotFoundError('expediente', expedienteId);
    const exists = before.contactos.some(
      (c) => c.contactoId.toString() === contactoId && c.rol === rol,
    );
    if (!exists) throw new NotFoundError('vinculo', `${contactoId}/${rol}`);

    const updated = await this.repo.pullContacto(usuarioId, expedienteId, contactoId, rol);

    this.eventEmitter.emit('expedientes.unlinked', {
      usuarioId,
      recurso: 'expediente',
      recursoId: expedienteId,
      contexto: { contactoId, rol },
    } satisfies AuditEventPayload);

    return updated;
  }

  private async registerParametros(usuarioId: string, parametros: Record<string, unknown>) {
    for (const nombre of Object.keys(parametros)) {
      await this.esquemasService.addParametro(usuarioId, 'expediente', {
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
