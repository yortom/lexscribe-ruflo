import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Clausula, ClausulaDocument } from './schemas/clausula.schema';
import {
  CreateClausulaInput,
  UpdateClausulaInput,
  QueryClausulaInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ClausulasRepository {
  constructor(@InjectModel(Clausula.name) private readonly model: Model<ClausulaDocument>) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  async findAll(
    usuarioId: string,
    opts: QueryClausulaInput,
  ): Promise<{ items: ClausulaDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
    };
    // label ya viene normalizado a lowercase por el Zod schema
    if (opts.label) filter.labels = opts.label;
    // $text es operador top-level del filter (Pitfall 1) — case/diacritic-insensitive
    if (opts.search) filter.$text = { $search: opts.search };

    const projection = opts.search ? { score: { $meta: 'textScore' } } : undefined;
    const sort: Record<string, { $meta: string } | -1 | 1> = opts.search
      ? { score: { $meta: 'textScore' } }
      : { fechaCreacion: -1 };

    const [items, total] = await Promise.all([
      this.model
        .find(filter, projection)
        .sort(sort)
        .skip((opts.page - 1) * opts.limit)
        .limit(opts.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  async findById(usuarioId: string, id: string): Promise<ClausulaDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
      })
      .exec();
  }

  async create(usuarioId: string, data: CreateClausulaInput): Promise<ClausulaDocument> {
    return this.model.create({ ...data, usuarioId: this.toObjectId(usuarioId) });
  }

  async update(
    usuarioId: string,
    id: string,
    data: UpdateClausulaInput,
  ): Promise<ClausulaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDelete(usuarioId: string, id: string): Promise<ClausulaDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
