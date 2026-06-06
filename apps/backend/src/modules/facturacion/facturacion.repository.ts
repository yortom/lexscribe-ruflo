/**
 * FacturacionRepository — data access layer for the facturas collection (DATOS §4.7).
 * FAC-01: listByExpediente sorted by fecha desc, activo:true filter.
 * FAC-04: update (patch mutable fields) + softDelete.
 * FAC-05: getTotales — MongoDB $group/$sum aggregate with explicit activo:true in $match.
 *
 * CRITICAL: softDeletePlugin does NOT intercept .aggregate() (Pitfall 1).
 * Always add { activo: true } to the $match stage manually.
 *
 * Pitfall 6: round importe sum to 2 decimals — IEEE 754 drift avoidance.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Factura, FacturaDocument } from './schemas/factura.schema';
import type { CreateFacturaInput, QueryFacturaInput } from '@lexscribe/shared-validation';
import type { FacturaTotales } from '@lexscribe/shared-types';

export interface CreateFacturaData extends Omit<CreateFacturaInput, 'expedienteId' | 'fecha'> {
  expedienteId: string;
  fecha: Date;
}

@Injectable()
export class FacturacionRepository {
  constructor(
    @InjectModel(Factura.name) private readonly model: Model<FacturaDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  /** FAC-02: create a new factura entry for an expediente. */
  async create(usuarioId: string, data: CreateFacturaData): Promise<FacturaDocument> {
    return this.model.create({
      ...data,
      usuarioId: this.toObjectId(usuarioId),
      expedienteId: this.toObjectId(data.expedienteId),
    });
  }

  /** Get a single factura by ID (activo:true). */
  async findById(usuarioId: string, id: string): Promise<FacturaDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      })
      .exec();
  }

  /** FAC-01: list facturas for an expediente, sorted by fecha desc, paginated. */
  async listByExpediente(
    usuarioId: string,
    expedienteId: string,
    q: QueryFacturaInput,
  ): Promise<{ items: FacturaDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
      expedienteId: this.toObjectId(expedienteId),
      activo: true,
    };

    const skip = (q.page - 1) * q.limit;
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ fecha: -1 }).skip(skip).limit(q.limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /** FAC-04: update mutable fields (concepto, importe, fecha, numero, notas). */
  async update(
    usuarioId: string,
    id: string,
    patch: Partial<Pick<CreateFacturaInput, 'concepto' | 'importe' | 'numero' | 'notas'> & { fecha?: Date }>,
  ): Promise<FacturaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId), activo: true },
        { $set: patch },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** FAC-03: update estado via dedicated endpoint. */
  async updateEstado(
    usuarioId: string,
    id: string,
    estado: 'pendiente' | 'facturado' | 'cobrado',
  ): Promise<FacturaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId), activo: true },
        { $set: { estado } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** FAC-04: soft-delete a factura (sets activo:false + fechaInactivacion). */
  async softDelete(usuarioId: string, id: string): Promise<FacturaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * FAC-05: aggregate total + per-status subtotals for an expediente.
   *
   * Uses MongoDB $group/$sum pipeline (RESEARCH Pattern 3).
   * MANDATORY: $match includes activo:true — softDeletePlugin does NOT hook .aggregate().
   * Pitfall 6: each value is rounded to 2 decimals to prevent IEEE 754 drift.
   */
  async getTotales(usuarioId: string, expedienteId: string): Promise<FacturaTotales> {
    const uid = this.toObjectId(usuarioId);
    const oid = this.toObjectId(expedienteId);

    const result = await this.model
      .aggregate([
        {
          $match: {
            usuarioId: uid,
            expedienteId: oid,
            activo: true,  // MANDATORY — softDeletePlugin does NOT intercept .aggregate()
          },
        },
        {
          $group: {
            _id: '$estado',
            subtotal: { $sum: '$importe' },
          },
        },
      ])
      .exec();

    const map: Record<string, number> = {};
    for (const row of result) {
      map[row._id as string] = row.subtotal as number;
    }

    // Pitfall 6: round to 2 decimals to avoid IEEE 754 floating-point drift
    const pendiente = Math.round((map['pendiente'] ?? 0) * 100) / 100;
    const facturado = Math.round((map['facturado'] ?? 0) * 100) / 100;
    const cobrado = Math.round((map['cobrado'] ?? 0) * 100) / 100;
    const total = Math.round((pendiente + facturado + cobrado) * 100) / 100;

    return { total, pendiente, facturado, cobrado };
  }
}
