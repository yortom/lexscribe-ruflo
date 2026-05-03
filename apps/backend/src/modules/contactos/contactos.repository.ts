import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contacto, ContactoDocument } from './schemas/contacto.schema';
import {
  CreateContactoInput,
  UpdateContactoInput,
  QueryContactoInput,
} from '@lexscribe/shared-validation';

@Injectable()
export class ContactosRepository {
  constructor(
    @InjectModel(Contacto.name) private readonly model: Model<ContactoDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  async findAll(
    usuarioId: string,
    opts: QueryContactoInput,
  ): Promise<{ items: ContactoDocument[]; total: number }> {
    const filter: Record<string, unknown> = {
      usuarioId: this.toObjectId(usuarioId),
    };
    if (opts.tipologia) filter.tipologia = opts.tipologia;
    if (opts.search) filter.$text = { $search: opts.search };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .skip((opts.page - 1) * opts.limit)
        .limit(opts.limit)
        .sort({ fechaCreacion: -1 })
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  async findById(
    usuarioId: string,
    id: string,
  ): Promise<ContactoDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
      })
      .exec();
  }

  async create(
    usuarioId: string,
    data: CreateContactoInput,
  ): Promise<ContactoDocument> {
    return this.model.create({ ...data, usuarioId: this.toObjectId(usuarioId) });
  }

  async update(
    usuarioId: string,
    id: string,
    data: UpdateContactoInput,
  ): Promise<ContactoDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  async softDelete(
    usuarioId: string,
    id: string,
  ): Promise<ContactoDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { new: true },
      )
      .exec();
  }
}
