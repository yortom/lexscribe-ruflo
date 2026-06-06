/**
 * EventosService — orquestación del módulo de eventos/calendario.
 * CAL-01/CAL-02: crear eventos (origen documento o manual).
 * CAL-03: listar con filtros de expediente, rango de fecha, soloCalendario.
 * CAL-04: actualizar color/visibilidad/otros campos mutables vía PATCH.
 * CAL-05: softDeleteByDocumentoId exportado vía repositorio (consumido por FL-9 en 07-03).
 */
import { Injectable } from '@nestjs/common';
import { EventosRepository } from './eventos.repository';
import { NotFoundError } from '../../common/errors';
import type { CreateEventoInput, QueryEventoInput, UpdateEventoInput } from '@lexscribe/shared-validation';

@Injectable()
export class EventosService {
  constructor(private readonly repo: EventosRepository) {}

  /** CAL-01 / CAL-02: create evento (origen documento o manual). */
  async create(usuarioId: string, dto: CreateEventoInput) {
    return this.repo.create(usuarioId, dto);
  }

  /** CAL-03: list eventos with filters (expedienteId, date range, soloCalendario). */
  async list(usuarioId: string, q: QueryEventoInput) {
    const { items, total } = await this.repo.list(usuarioId, q);
    return { items, total, page: q.page, limit: q.limit };
  }

  /** Get a single evento by ID. Throws NotFoundError if not found. */
  async getById(usuarioId: string, id: string) {
    const e = await this.repo.findById(usuarioId, id);
    if (!e) throw new NotFoundError('evento', id);
    return e;
  }

  /** CAL-04: update mutable fields (color, mostrarEnCalendario, etc.). */
  async update(usuarioId: string, id: string, dto: UpdateEventoInput) {
    const updated = await this.repo.update(usuarioId, id, dto);
    if (!updated) throw new NotFoundError('evento', id);
    return updated;
  }

  /** Soft-delete an evento by ID. Throws NotFoundError if not found. */
  async remove(usuarioId: string, id: string) {
    const del = await this.repo.softDelete(usuarioId, id);
    if (!del) throw new NotFoundError('evento', id);
    return del;
  }

  /**
   * Count active events for a document (FL-9 pre-check).
   * Returns { total } consumed by GET /eventos/count?documentoId=:id.
   */
  async countByDocumento(usuarioId: string, documentoId: string): Promise<{ total: number }> {
    const total = await this.repo.countByDocumentoId(usuarioId, documentoId);
    return { total };
  }
}
