import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Documento, DocumentoDocument } from './schemas/documento.schema';
import { QueryDocumentoInput } from '@lexscribe/shared-validation';

/** Data required to create a new documento record. */
export interface CreateDocumentoData {
  _id?: Types.ObjectId;
  expedienteId: string | Types.ObjectId;
  nombre: string;
  tipo: 'generado' | 'subido';
  plantillaId?: string | Types.ObjectId | null;
  datosCongelados?: Record<string, unknown> | null;
  clausulasUsadas?: Types.ObjectId[] | string[] | null;
  storagePath: string;
  formato: 'docx' | 'pdf' | 'txt';
}

@Injectable()
export class DocumentosRepository {
  constructor(
    @InjectModel(Documento.name) private readonly model: Model<DocumentoDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  async create(usuarioId: string, data: CreateDocumentoData): Promise<DocumentoDocument> {
    return this.model.create({
      ...data,
      usuarioId: this.toObjectId(usuarioId),
      expedienteId: this.toObjectId(data.expedienteId),
    });
  }

  async findById(usuarioId: string, id: string): Promise<DocumentoDocument | null> {
    return this.model
      .findOne({
        _id: this.toObjectId(id),
        usuarioId: this.toObjectId(usuarioId),
        activo: true,
      })
      .exec();
  }

  async listByExpediente(
    usuarioId: string,
    expedienteId: string,
    opts: QueryDocumentoInput,
  ): Promise<{ items: DocumentoDocument[]; total: number }> {
    const filter = {
      usuarioId: this.toObjectId(usuarioId),
      expedienteId: this.toObjectId(expedienteId),
      activo: true,
    };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ fechaCreacion: -1 })
        .skip((opts.page - 1) * opts.limit)
        .limit(opts.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  async softDelete(usuarioId: string, id: string): Promise<DocumentoDocument | null> {
    return this.model
      .findOneAndUpdate(
        { _id: this.toObjectId(id), usuarioId: this.toObjectId(usuarioId) },
        { $set: { activo: false, fechaInactivacion: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
