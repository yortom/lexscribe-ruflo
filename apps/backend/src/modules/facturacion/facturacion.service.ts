/**
 * FacturacionService — business logic for the facturas module.
 * FAC-01: list facturas by expediente.
 * FAC-02: create with fecha default to today when omitted.
 * FAC-03: updateEstado via dedicated method.
 * FAC-04: update mutable fields + softDelete.
 * FAC-05: getTotales via aggregate (delegated to repository).
 */
import { Injectable } from '@nestjs/common';
import { FacturacionRepository } from './facturacion.repository';
import { NotFoundError } from '../../common/errors';
import type { CreateFacturaInput, UpdateFacturaInput, QueryFacturaInput } from '@lexscribe/shared-validation';
import type { FacturaTotales } from '@lexscribe/shared-types';

@Injectable()
export class FacturacionService {
  constructor(private readonly repo: FacturacionRepository) {}

  /** FAC-02: create a factura. Defaults fecha to today when omitted. */
  async create(usuarioId: string, dto: CreateFacturaInput) {
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    return this.repo.create(usuarioId, { ...dto, fecha });
  }

  /** FAC-01: list facturas for an expediente (sorted by fecha desc, paginated). */
  async list(usuarioId: string, q: QueryFacturaInput) {
    const { items, total } = await this.repo.listByExpediente(usuarioId, q.expedienteId, q);
    return { items, total, page: q.page, limit: q.limit };
  }

  /** Get a single factura by ID. Throws NotFoundError if not found. */
  async getById(usuarioId: string, id: string) {
    const f = await this.repo.findById(usuarioId, id);
    if (!f) throw new NotFoundError('factura', id);
    return f;
  }

  /** FAC-04: update mutable fields. Throws NotFoundError if not found. */
  async update(usuarioId: string, id: string, dto: UpdateFacturaInput) {
    const { fecha, ...rest } = dto;
    const patch: Partial<
      Pick<CreateFacturaInput, 'concepto' | 'importe' | 'numero' | 'notas'> & { fecha?: Date }
    > = {
      ...rest,
      ...(fecha ? { fecha: new Date(fecha) } : {}),
    };
    const updated = await this.repo.update(usuarioId, id, patch);
    if (!updated) throw new NotFoundError('factura', id);
    return updated;
  }

  /** FAC-03: update estado via dedicated endpoint. Throws NotFoundError if not found. */
  async updateEstado(
    usuarioId: string,
    id: string,
    estado: 'pendiente' | 'facturado' | 'cobrado',
  ) {
    const updated = await this.repo.updateEstado(usuarioId, id, estado);
    if (!updated) throw new NotFoundError('factura', id);
    return updated;
  }

  /** FAC-04: soft-delete a factura. Throws NotFoundError if not found. */
  async remove(usuarioId: string, id: string) {
    const del = await this.repo.softDelete(usuarioId, id);
    if (!del) throw new NotFoundError('factura', id);
    return del;
  }

  /** FAC-05: get total + per-status subtotals for an expediente (on-the-fly aggregate). */
  async getTotales(usuarioId: string, expedienteId: string): Promise<FacturaTotales> {
    return this.repo.getTotales(usuarioId, expedienteId);
  }
}
