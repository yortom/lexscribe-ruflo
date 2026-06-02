import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expediente, ExpedienteDocument } from './schemas/expediente.schema';
import {
  CreateExpedienteInput,
  UpdateExpedienteInput,
  QueryExpedienteInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ExpedientesRepository {
  constructor(
    @InjectModel(Expediente.name) private readonly model: Model<ExpedienteDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  async findAll(
    usuarioId: string,
    opts: QueryExpedienteInput,
  ): Promise<{ items: ExpedienteDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
    };
    if (opts.contactoId) {
      filter['contactos.contactoId'] = this.toObjectId(opts.contactoId);
    }
    if (opts.search) {
      filter.$text = { $search: opts.search };
    }
    const sort: Record<string, { $meta: 'textScore' } | -1> = opts.search
      ? { score: { $meta: 'textScore' } }
      : { fechaCreacion: -1 };
    const projection = opts.search ? { score: { $meta: 'textScore' } } : undefined;
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

  async findById(usuarioId: string, id: string): Promise<ExpedienteDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
      })
      .exec();
  }

  async create(usuarioId: string, data: CreateExpedienteInput): Promise<ExpedienteDocument> {
    return this.model.create({ ...data, usuarioId: this.toObjectId(usuarioId) });
  }

  async update(
    usuarioId: string,
    id: string,
    data: UpdateExpedienteInput,
  ): Promise<ExpedienteDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: data },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDelete(usuarioId: string, id: string): Promise<ExpedienteDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async findByContactoId(
    usuarioId: string,
    contactoId: string,
  ): Promise<ExpedienteDocument[]> {
    return this.model
      .find({
        usuarioId: this.toObjectId(usuarioId),
        'contactos.contactoId': this.toObjectId(contactoId),
      })
      .exec();
  }

  async pushContacto(
    usuarioId: string,
    expedienteId: string,
    vinculo: { contactoId: Types.ObjectId; rol: string },
  ): Promise<ExpedienteDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(expedienteId), usuarioId: this.toObjectId(usuarioId) },
        { $push: { contactos: vinculo } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async pullContacto(
    usuarioId: string,
    expedienteId: string,
    contactoId: string,
    rol: string,
  ): Promise<ExpedienteDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(expedienteId), usuarioId: this.toObjectId(usuarioId) },
        { $pull: { contactos: { contactoId: this.toObjectId(contactoId), rol } } },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
