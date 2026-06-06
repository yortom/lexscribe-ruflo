import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Evento, EventoDocument } from './schemas/evento.schema';
import type { CreateEventoInput, QueryEventoInput } from '@lexscribe/shared-validation';

/** Data required to create a new evento record. */
export interface CreateEventoData extends CreateEventoInput {
  usuarioId?: string;
}

@Injectable()
export class EventosRepository {
  constructor(
    @InjectModel(Evento.name) private readonly model: Model<EventoDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  private toObjectIdOrNull(id: string | Types.ObjectId | null | undefined): Types.ObjectId | null {
    if (!id) return null;
    return this.toObjectId(id);
  }

  async create(usuarioId: string, data: CreateEventoInput): Promise<EventoDocument> {
    return this.model.create({
      ...data,
      usuarioId: this.toObjectId(usuarioId),
      expedienteId: this.toObjectIdOrNull(data.expedienteId),
      documentoId: this.toObjectIdOrNull(data.documentoId),
      fechaInicio: new Date(data.fechaInicio),
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
    });
  }

  async findById(usuarioId: string, id: string): Promise<EventoDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      })
      .exec();
  }

  async list(
    usuarioId: string,
    q: QueryEventoInput,
  ): Promise<{ items: EventoDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
      activo: true,
    };

    if (q.expedienteId) {
      filter['expedienteId'] = this.toObjectId(q.expedienteId);
    }

    if (q.documentoId) {
      filter['documentoId'] = this.toObjectId(q.documentoId);
    }

    if (q.soloCalendario) {
      filter['mostrarEnCalendario'] = true;
    }

    if (q.fechaDesde || q.fechaHasta) {
      const range: Record<string, Date> = {};
      if (q.fechaDesde) range['$gte'] = new Date(q.fechaDesde);
      if (q.fechaHasta) range['$lte'] = new Date(q.fechaHasta);
      filter['fechaInicio'] = range;
    }

    const skip = (q.page - 1) * q.limit;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ fechaInicio: 1 })
        .skip(skip)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async update(
    usuarioId: string,
    id: string,
    patch: Partial<CreateEventoInput>,
  ): Promise<EventoDocument | null> {
    const updateData: Record<string, unknown> = { ...patch };

    if (patch.fechaInicio) updateData['fechaInicio'] = new Date(patch.fechaInicio);
    if (patch.fechaFin) updateData['fechaFin'] = new Date(patch.fechaFin);
    if (patch.expedienteId !== undefined) updateData['expedienteId'] = this.toObjectIdOrNull(patch.expedienteId);
    if (patch.documentoId !== undefined) updateData['documentoId'] = this.toObjectIdOrNull(patch.documentoId);

    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId), activo: true },
        { $set: updateData },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDelete(usuarioId: string, id: string): Promise<EventoDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Soft-delete all active events associated with a document (CAL-05, FL-9).
   * Called by DocumentosService.remove() when eventosAction='eliminar'.
   * Returns modifiedCount (number of events inactivated).
   */
  async softDeleteByDocumentoId(usuarioId: string, documentoId: string): Promise<number> {
    const result = await this.model.updateMany(
      {
        documentoId: this.toObjectId(documentoId),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      },
      { $set: { activo: false, fechaInactivacion: new Date() } },
    );
    return result.modifiedCount;
  }

  /**
   * Count active events for a document (FL-9 pre-check: used by GET /eventos/count).
   * Returns the number to decide whether to show the conservar/eliminar modal.
   */
  async countByDocumentoId(usuarioId: string, documentoId: string): Promise<number> {
    return this.model
      .countDocuments({
        documentoId: this.toObjectId(documentoId),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      })
      .exec();
  }
}
